// Automatic Lead Assignment Engine
import { prisma } from "@/lib/prisma";
import { isTerritoryAwareAssignmentEnabled } from "@/lib/platform-settings";
import { resolveSuggBranch, type GeoInput } from "@/lib/sugg-territory";

/**
 * Territory-aware entry point for Sugg-internal lead routing. When the platform
 * toggle is ON and the student's location resolves to a covering Sugg Branch
 * with an active Sugg counselor, the lead is assigned within that branch
 * (course-based, else round-robin). Otherwise it FALLS BACK to the existing
 * global assignment, so behavior is unchanged while the toggle is OFF (default).
 *
 * Agency-side lead flows do not call this — they remain unchanged.
 */
export async function assignLeadTerritoryAware(
  leadId: string,
  geo: GeoInput,
  interestedCourse?: string
): Promise<string | null> {
  try {
    const enabled = await isTerritoryAwareAssignmentEnabled();
    if (enabled) {
      const branch = await resolveSuggBranch(geo);
      if (branch) {
        const counselorId = await assignWithinSuggBranch(leadId, branch.id, interestedCourse);
        if (counselorId) return counselorId;
      }
    }
  } catch (error) {
    console.error("Territory-aware assignment error:", error);
  }
  // Fall back to existing global assignment.
  return assignLeadToNextCounselor(leadId, interestedCourse);
}

/**
 * Pick a Sugg counselor within a specific Sugg Branch. Course-based match first
 * (specialists in the branch), then round-robin over the branch's counselors.
 * Returns null when the branch has no eligible active counselor.
 */
async function assignWithinSuggBranch(
  leadId: string,
  suggBranchId: string,
  interestedCourse?: string
): Promise<string | null> {
  const counselors = await prisma.counselor.findMany({
    where: {
      suggBranchId,
      isAvailable: true,
      user: { isActive: true, role: { in: ["SUGG_COUNSELOR", "SUGG_BRANCH_MANAGER"] } },
    },
    include: {
      user: {
        include: {
          assignedLeads: {
            where: { status: { notIn: ["ADMISSION_CONFIRMED", "LOST"] } },
            select: { id: true },
          },
        },
      },
    },
  });

  const eligible = counselors.filter(
    (c) => c.user.assignedLeads.length < c.maxLeads
  );
  if (!eligible.length) return null;

  // Course-based: prefer a specialist in the branch with the fewest active leads.
  if (interestedCourse) {
    const courseNormalized = interestedCourse.toLowerCase();
    const specialists = eligible
      .filter((c) =>
        c.specializations.some(
          (s) => s.toLowerCase() === courseNormalized || s === interestedCourse
        )
      )
      .sort((a, b) => a.user.assignedLeads.length - b.user.assignedLeads.length);
    if (specialists.length) {
      await assignLead(leadId, specialists[0].userId, "COURSE_BASED");
      return specialists[0].userId;
    }
  }

  // Round-robin within the branch: fewest active leads wins.
  const selected = eligible.sort(
    (a, b) => a.user.assignedLeads.length - b.user.assignedLeads.length
  )[0];
  await assignLead(leadId, selected.userId, "ROUND_ROBIN");
  return selected.userId;
}

/**
 * Assign a lead to the next available counselor using round-robin or course-based assignment.
 */
export async function assignLeadToNextCounselor(
  leadId: string,
  interestedCourse?: string
): Promise<string | null> {
  try {
    // 1. Try course-based assignment first
    if (interestedCourse) {
      const courseSpecialist = await findCourseSpecialist(interestedCourse);
      if (courseSpecialist) {
        await assignLead(leadId, courseSpecialist, "COURSE_BASED");
        return courseSpecialist;
      }
    }

    // 2. Fall back to round-robin
    const counselorId = await roundRobinAssign(leadId);
    return counselorId;
  } catch (error) {
    console.error("Lead assignment error:", error);
    return null;
  }
}

async function findCourseSpecialist(course: string): Promise<string | null> {
  const courseNormalized = course.toLowerCase();

  const specialists = await prisma.counselor.findMany({
    where: {
      isAvailable: true,
      user: { isActive: true },
      specializations: {
        hasSome: [courseNormalized, course],
      },
    },
    include: {
      user: {
        include: {
          assignedLeads: {
            where: {
              status: { notIn: ["ADMISSION_CONFIRMED", "LOST"] },
            },
            select: { id: true },
          },
        },
      },
    },
    orderBy: {
      user: {
        assignedLeads: {
          _count: "asc",
        },
      },
    },
    take: 1,
  });

  if (!specialists.length) return null;

  const specialist = specialists[0];
  // Check if counselor hasn't exceeded max leads
  if (specialist.user.assignedLeads.length >= specialist.maxLeads) {
    return null;
  }

  return specialist.userId;
}

async function roundRobinAssign(leadId: string): Promise<string | null> {
  // Get all available counselors with their active lead counts
  const counselors = await prisma.counselor.findMany({
    where: {
      isAvailable: true,
      user: { isActive: true, role: "SUGG_COUNSELOR" },
    },
    include: {
      user: {
        include: {
          assignedLeads: {
            where: {
              status: { notIn: ["ADMISSION_CONFIRMED", "LOST"] },
            },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!counselors.length) return null;

  // Find counselor with fewest active leads who hasn't exceeded limit
  const eligible = counselors
    .filter((c) => c.user.assignedLeads.length < c.maxLeads)
    .sort((a, b) => a.user.assignedLeads.length - b.user.assignedLeads.length);

  if (!eligible.length) return null;

  const selected = eligible[0];
  await assignLead(leadId, selected.userId, "ROUND_ROBIN");
  return selected.userId;
}

async function assignLead(
  leadId: string,
  counselorId: string,
  rule: "ROUND_ROBIN" | "COURSE_BASED" | "MANUAL"
) {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      assignedToId: counselorId,
      assignmentRule: rule,
      status: "NEW",
    },
  });
}

/**
 * Check for leads with no activity in 3 days and create follow-up reminders.
 * Should be called from a cron job.
 */
export async function createInactivityFollowups() {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // Find leads with no contact in 3 days
  const staleLeads = await prisma.lead.findMany({
    where: {
      assignedToId: { not: null },
      status: { notIn: ["ADMISSION_CONFIRMED", "LOST"] },
      OR: [
        { lastContactedAt: { lt: threeDaysAgo } },
        { lastContactedAt: null, createdAt: { lt: threeDaysAgo } },
      ],
      // Check no pending followup already exists
      followups: {
        none: {
          status: "PENDING",
          dueAt: { gte: new Date() },
        },
      },
    },
    include: {
      student: { select: { name: true } },
    },
    take: 100,
  });

  const created = await Promise.allSettled(
    staleLeads.map((lead) =>
      prisma.leadFollowup.create({
        data: {
          leadId: lead.id,
          userId: lead.assignedToId!,
          title: `Follow up with ${lead.student.name}`,
          description: "No activity for 3 days. Reach out to the student.",
          dueAt: new Date(),
          status: "PENDING",
        },
      })
    )
  );

  return {
    processed: staleLeads.length,
    created: created.filter((r) => r.status === "fulfilled").length,
  };
}

/**
 * Manual override: assign lead to specific counselor
 */
export async function manualAssignLead(
  leadId: string,
  counselorId: string
): Promise<void> {
  await assignLead(leadId, counselorId, "MANUAL");
}
