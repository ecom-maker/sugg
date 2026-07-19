"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { assignLeadToNextCounselor, manualAssignLead } from "@/lib/lead-assignment";
import { normalizeMobileE164 } from "@/lib/mobile-normalize";
import { calculateLeadScore } from "@/lib/utils";
import { createNotification, NotificationMessages } from "@/lib/notifications";
import { getSuggBranchScope } from "@/lib/sugg-branch-scope";
import { resolveLeadAccess } from "@/lib/lead-access";
import { Prisma } from "@prisma/client";
import type { LeadStatus } from "@/types";

/**
 * Edit a lead's student-facing details (max fees, interested courses, preferred
 * colleges). Scoped: assigned counsellor, their branch manager, or Super Admin.
 * Each change is recorded to the audit log (shown as change history).
 */
export async function updateLeadDetails(
  leadId: string,
  input: { budget?: string | null; budgetMin?: string | null; interestedCourse?: string | null; preferredCollege?: string | null }
) {
  const user = await requireAuth();

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true, studentId: true, assignedToId: true, suggBranchId: true,
      student: { select: { budget: true, budgetMin: true, interestedCourse: true, preferredCollege: true } },
    },
  });
  if (!lead) return { error: "Lead not found" };

  const access = await resolveLeadAccess(user, lead);
  if (!access.canEdit) return { error: "You cannot edit this lead" };

  const data: Record<string, unknown> = {};
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};

  if (input.budget !== undefined) {
    const next = input.budget && input.budget !== "" ? parseFloat(input.budget) : null;
    const prev = lead.student.budget != null ? Number(lead.student.budget) : null;
    if (next !== prev) {
      data.budget = next;
      oldValue.maxFees = prev;
      newValue.maxFees = next;
    }
  }
  if (input.budgetMin !== undefined) {
    const next = input.budgetMin && input.budgetMin !== "" ? parseFloat(input.budgetMin) : null;
    const prev = lead.student.budgetMin != null ? Number(lead.student.budgetMin) : null;
    if (next !== prev) {
      data.budgetMin = next;
      oldValue.minFees = prev;
      newValue.minFees = next;
    }
  }
  if (input.interestedCourse !== undefined) {
    const next = input.interestedCourse?.trim() || null;
    if (next !== (lead.student.interestedCourse || null)) {
      data.interestedCourse = next;
      oldValue.interestedCourse = lead.student.interestedCourse;
      newValue.interestedCourse = next;
    }
  }
  if (input.preferredCollege !== undefined) {
    const next = input.preferredCollege?.trim() || null;
    if (next !== (lead.student.preferredCollege || null)) {
      data.preferredCollege = next;
      oldValue.preferredCollege = lead.student.preferredCollege;
      newValue.preferredCollege = next;
    }
  }

  if (Object.keys(data).length === 0) return { success: true };

  await prisma.$transaction(async (tx) => {
    await tx.student.update({ where: { id: lead.studentId }, data });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_LEAD_DETAILS",
        resource: "lead",
        resourceId: leadId,
        oldValue: oldValue as Prisma.InputJsonValue,
        newValue: newValue as Prisma.InputJsonValue,
      },
    });
  });

  revalidatePath(`/counselor/leads/${leadId}`);
  return { success: true };
}

/**
 * Set/clear a lead's expected closing date. The date is mandatory (non-empty)
 * until the lead reaches ADMISSION_CONFIRMED; only then may it be cleared.
 * Scoped like other lead edits (assigned counsellor, branch manager, admin).
 */
export async function updateExpectedClosingDate(leadId: string, date: string | null) {
  const user = await requireAuth();

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true, studentId: true, assignedToId: true, suggBranchId: true,
      status: true, expectedClosingDate: true,
    },
  });
  if (!lead) return { error: "Lead not found" };

  const access = await resolveLeadAccess(user, lead);
  if (!access.canEdit) return { error: "You cannot edit this lead" };

  const trimmed = (date ?? "").trim();
  if (!trimmed && lead.status !== "ADMISSION_CONFIRMED") {
    return { error: "Expected closing date is required until admission is confirmed" };
  }
  const next = trimmed ? new Date(trimmed) : null;
  if (next && Number.isNaN(next.getTime())) {
    return { error: "Enter a valid date" };
  }

  const prevIso = lead.expectedClosingDate ? lead.expectedClosingDate.toISOString().slice(0, 10) : null;
  const nextIso = next ? next.toISOString().slice(0, 10) : null;
  if (prevIso === nextIso) return { success: true };

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({ where: { id: leadId }, data: { expectedClosingDate: next } });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_LEAD_DETAILS",
        resource: "lead",
        resourceId: leadId,
        oldValue: { expectedClosingDate: prevIso } as Prisma.InputJsonValue,
        newValue: { expectedClosingDate: nextIso } as Prisma.InputJsonValue,
      },
    });
  });

  revalidatePath(`/counselor/leads/${leadId}`);
  return { success: true };
}

const createStudentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  mobile: z.string().min(10, "Enter a valid mobile number"),
  email: z.string().email().optional().or(z.literal("")),
  city: z.string().optional(),
  country: z.string().optional(),
  educationLevel: z.string().optional(),
  qualification: z.string().optional(),
  interestedCourse: z.string().optional(),
  preferredCollege: z.string().optional(),
  preferredCountry: z.string().optional(),
  budget: z.string().optional(),
  budgetMin: z.string().optional(),
  expectedClosingDate: z.string().optional(),
  source: z.enum(["WHATSAPP", "AGENCY_REFERRAL", "MANUAL_ENTRY"]).default("MANUAL_ENTRY"),
});

export async function createStudentAndLead(formData: FormData) {
  const user = await requireRole(["SUGG_COUNSELOR", "SUPER_ADMIN", "AGENCY_ADMIN", "AGENCY_COUNSELOR"]);

  const raw = Object.fromEntries(formData.entries());
  const parsed = createStudentSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // Check duplicate
  const normalizedMobile = normalizeMobileE164(data.mobile);

  const existing = await prisma.student.findFirst({
    where: {
      OR: [
        { mobile: data.mobile },
        { mobileNumberNormalized: normalizedMobile },
      ],
    },
  });
  if (existing) {
    return { error: { mobile: ["A student with this phone number already exists"] } };
  }

  const score = calculateLeadScore({
    hasEmail: !!data.email,
    hasCity: !!data.city,
    hasBudget: !!data.budget,
    hasQualification: !!data.qualification,
    hasPreferredCollege: !!data.preferredCollege,
    source: data.source,
  });

  const student = await prisma.student.create({
    data: {
      name: data.name,
      mobile: data.mobile,
      mobileNumberNormalized: normalizedMobile,
      email: data.email || null,
      city: data.city || null,
      country: data.country || null,
      educationLevel: data.educationLevel || null,
      qualification: data.qualification || null,
      interestedCourse: data.interestedCourse || null,
      preferredCollege: data.preferredCollege || null,
      preferredCountry: data.preferredCountry || null,
      budget: data.budget ? parseFloat(data.budget) : null,
      budgetMin: data.budgetMin ? parseFloat(data.budgetMin) : null,
      source: data.source,
    },
  });

  // A counsellor who adds a lead owns it directly, so it shows in their
  // "My Leads". Admin-created leads still go through the assignment engine.
  const isCounselor = user.role === "SUGG_COUNSELOR" || user.role === "AGENCY_COUNSELOR";

  const lead = await prisma.lead.create({
    data: {
      studentId: student.id,
      source: data.source,
      status: "NEW",
      score,
      isCurrent: true,
      assignedToId: isCounselor ? user.id : undefined,
      expectedClosingDate: data.expectedClosingDate ? new Date(data.expectedClosingDate) : null,
    },
  });

  // Auto-assign only when a non-counsellor created it.
  if (data.source === "MANUAL_ENTRY" && !isCounselor) {
    await assignLeadToNextCounselor(lead.id, data.interestedCourse);
  }

  revalidatePath("/counselor/leads");
  revalidatePath("/admin/leads");

  return { success: true, leadId: lead.id };
}

/**
 * Add a lead directly under a Sugg Branch (not routed through an agency).
 * Only a Sugg Branch Manager with a resolved branch may do this; the lead is
 * tagged with their Sugg Branch so it appears in the branch's scoped view.
 */
export async function createSuggBranchLead(formData: FormData) {
  const user = await requireRole(["SUGG_BRANCH_MANAGER", "SUPER_ADMIN"]);
  const scope = await getSuggBranchScope(user);
  if (!scope) return { error: { _form: ["No Sugg Branch is assigned to you."] } };

  const parsed = createStudentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  const normalizedMobile = normalizeMobileE164(data.mobile);
  const existing = await prisma.student.findFirst({
    where: { OR: [{ mobile: data.mobile }, { mobileNumberNormalized: normalizedMobile }] },
    select: { id: true },
  });
  if (existing) return { error: { mobile: ["A student with this phone number already exists"] } };

  const score = calculateLeadScore({
    hasEmail: !!data.email,
    hasCity: !!data.city,
    hasBudget: !!data.budget,
    hasQualification: !!data.qualification,
    hasPreferredCollege: !!data.preferredCollege,
    source: "MANUAL_ENTRY",
  });

  const student = await prisma.student.create({
    data: {
      name: data.name,
      mobile: data.mobile,
      mobileNumberNormalized: normalizedMobile,
      email: data.email || null,
      city: data.city || null,
      country: data.country || null,
      educationLevel: data.educationLevel || null,
      qualification: data.qualification || null,
      interestedCourse: data.interestedCourse || null,
      preferredCollege: data.preferredCollege || null,
      preferredCountry: data.preferredCountry || null,
      budget: data.budget ? parseFloat(data.budget) : null,
      budgetMin: data.budgetMin ? parseFloat(data.budgetMin) : null,
      source: "MANUAL_ENTRY",
    },
  });

  const lead = await prisma.lead.create({
    data: {
      studentId: student.id,
      source: "MANUAL_ENTRY",
      status: "NEW",
      score,
      isCurrent: true,
      suggBranchId: scope.suggBranchId,
      expectedClosingDate: data.expectedClosingDate ? new Date(data.expectedClosingDate) : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE_LEAD",
      resource: "lead",
      resourceId: lead.id,
      newValue: { student: student.name, suggBranchId: scope.suggBranchId },
    },
  });

  revalidatePath("/sugg-branch/leads");
  return { success: true, leadId: lead.id };
}

const FOLLOWUP_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "COUNSELING_SCHEDULED"];

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  reason?: string,
  note?: string,
  opts?: { followUpAt?: string | null; shortlistedCollege?: string | null }
) {
  const user = await requireAuth();

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { student: true },
  });

  if (!lead) return { error: "Lead not found" };

  // Counselors can only update their own leads
  if (
    (user.role === "SUGG_COUNSELOR" || user.role === "AGENCY_COUNSELOR") &&
    lead.assignedToId !== user.id
  ) {
    return { error: "Unauthorized" };
  }

  const fromStatus = lead.status;

  const updateData: Record<string, unknown> = {
    status,
    lastContactedAt: new Date(),
  };
  if (status === "LOST") {
    updateData.lostReason = reason;
  }

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({ where: { id: leadId }, data: updateData });

    // Append-only status history (spec §7).
    await tx.leadStatusHistory.create({
      data: {
        leadId,
        fromStatus,
        toStatus: status,
        changedById: user.id,
        note: note ?? reason ?? null,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_LEAD_STATUS",
        resource: "lead",
        resourceId: leadId,
        oldValue: { status: fromStatus },
        newValue: { status },
      },
    });

    // When the lead moves to a new status, resolve any still-pending follow-ups
    // from the previous stage — they're superseded and shouldn't sit overdue.
    if (fromStatus !== status) {
      await tx.leadFollowup.updateMany({
        where: { leadId, status: "PENDING" },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    // A date/time on an early-stage status schedules a new follow-up (calendar).
    let nextFollowUp: Date | null | undefined = undefined;
    if (opts?.followUpAt && FOLLOWUP_STATUSES.includes(status)) {
      const dueAt = new Date(opts.followUpAt);
      if (!isNaN(dueAt.getTime())) {
        await tx.leadFollowup.create({
          data: {
            leadId,
            userId: lead.assignedToId ?? user.id,
            title: `${status.replace(/_/g, " ")} — ${lead.student.name}`,
            dueAt,
            status: "PENDING",
          },
        });
        nextFollowUp = dueAt;
      }
    } else if (fromStatus !== status) {
      // Status changed with no new follow-up → clear the next-follow-up marker.
      nextFollowUp = null;
    }
    if (nextFollowUp !== undefined) {
      await tx.lead.update({ where: { id: leadId }, data: { nextFollowUpAt: nextFollowUp } });
    }

    // Shortlisting records the college on the student profile.
    if (status === "COLLEGE_SHORTLISTED" && opts?.shortlistedCollege?.trim()) {
      await tx.student.update({
        where: { id: lead.studentId },
        data: { shortlistedCollege: opts.shortlistedCollege.trim() },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "UPDATE_LEAD_DETAILS",
          resource: "lead",
          resourceId: leadId,
          oldValue: { shortlistedCollege: lead.student.shortlistedCollege },
          newValue: { shortlistedCollege: opts.shortlistedCollege.trim() },
        },
      });
    }

    // Mirror the lead into a college Application once it reaches an application
    // stage, so the shortlisted college sees it with the counsellor's status.
    const LEAD_TO_APP: Partial<Record<LeadStatus, "SUBMITTED" | "ACCEPTED" | "ENROLLED">> = {
      APPLICATION_SUBMITTED: "SUBMITTED",
      OFFER_RECEIVED: "ACCEPTED",
      ADMISSION_CONFIRMED: "ENROLLED",
    };
    const appStatus = LEAD_TO_APP[status];
    const collegeName = (opts?.shortlistedCollege?.trim() || lead.student.shortlistedCollege || "").trim();
    if (appStatus && collegeName) {
      const college = await tx.college.findFirst({
        where: { name: { equals: collegeName, mode: "insensitive" } },
        select: { id: true },
      });
      if (college) {
        const terms = (lead.student.interestedCourse ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        let course: { id: string } | null = null;
        for (const term of terms) {
          course = await tx.course.findFirst({
            where: { collegeId: college.id, name: { contains: term, mode: "insensitive" } },
            select: { id: true },
          });
          if (course) break;
        }
        if (!course) {
          course = await tx.course.findFirst({
            where: { collegeId: college.id, isActive: true },
            orderBy: { name: "asc" },
            select: { id: true },
          });
        }
        if (course) {
          const existingApp = await tx.application.findFirst({
            where: { studentId: lead.studentId, collegeId: college.id },
            select: { id: true, status: true },
          });
          if (existingApp) {
            if (existingApp.status !== appStatus) {
              await tx.application.update({
                where: { id: existingApp.id },
                data: { status: appStatus, ...(appStatus === "ENROLLED" ? { enrolledAt: new Date() } : {}) },
              });
              await tx.applicationStatusHistory.create({
                data: { applicationId: existingApp.id, status: appStatus, changedById: user.id },
              });
            }
          } else {
            const created = await tx.application.create({
              data: {
                studentId: lead.studentId,
                collegeId: college.id,
                courseId: course.id,
                status: appStatus,
                submittedById: user.id,
                managedBy: "SUGG",
                ...(appStatus === "ENROLLED" ? { enrolledAt: new Date() } : {}),
              },
            });
            await tx.applicationStatusHistory.create({
              data: { applicationId: created.id, status: appStatus, changedById: user.id },
            });
          }
        }
      }
    }
  });

  revalidatePath("/college/applications");
  revalidatePath(`/counselor/leads/${leadId}`);
  revalidatePath("/counselor/leads");
  revalidatePath("/counselor/followups");
  revalidatePath(`/agency/leads/${leadId}`);
  revalidatePath("/agency/leads");

  return { success: true };
}

export async function addLeadNote(leadId: string, content: string) {
  const user = await requireAuth();

  if (!content.trim()) return { error: "Note cannot be empty" };

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: "Lead not found" };

  await prisma.leadNote.create({
    data: { leadId, userId: user.id, content },
  });

  revalidatePath(`/counselor/leads/${leadId}`);
  return { success: true };
}

export async function scheduleFollowup(data: {
  leadId: string;
  title: string;
  description?: string;
  dueAt: Date;
}) {
  const user = await requireAuth();

  await prisma.leadFollowup.create({
    data: {
      leadId: data.leadId,
      userId: user.id,
      title: data.title,
      description: data.description,
      dueAt: data.dueAt,
      status: "PENDING",
    },
  });

  revalidatePath(`/counselor/leads/${data.leadId}`);
  revalidatePath("/counselor/followups");
  return { success: true };
}

export async function completeFollowup(followupId: string) {
  const user = await requireAuth();

  await prisma.leadFollowup.updateMany({
    where: { id: followupId, userId: user.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  revalidatePath("/counselor/followups");
  return { success: true };
}

export async function assignLeadManually(leadId: string, counselorId: string) {
  await requireRole(["SUPER_ADMIN"]);

  await manualAssignLead(leadId, counselorId);

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { student: true },
  });

  if (lead) {
    await createNotification({
      userId: counselorId,
      type: "NEW_LEAD_ASSIGNED",
      ...NotificationMessages.newLeadAssigned(lead.student.name),
      resourceId: leadId,
    });
  }

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  return { success: true };
}
