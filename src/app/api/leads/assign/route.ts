import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/**
 * POST /api/leads/assign
 * Assign a lead to Agency → Branch → Counselor
 * Body: { leadId, agencyId?, branchId?, counselorId?, strategy? }
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || !["SUPER_ADMIN", "AGENCY_OWNER", "AGENCY_ADMIN", "BRANCH_MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { leadId, agencyId, branchId, counselorId, strategy } = body;

    if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { student: true } });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    let resolvedBranchId = branchId;
    let resolvedCounselorId = counselorId;

    // Determine strategy
    if (!counselorId && branchId) {
      const assignmentMethod = strategy ?? "ROUND_ROBIN";

      if (assignmentMethod === "ROUND_ROBIN") {
        // Find counselor in branch with fewest assigned leads
        const branchUsers = await prisma.agencyUser.findMany({
          where: { branchId, user: { isActive: true, role: "AGENCY_COUNSELOR" } },
          include: { user: { include: { assignedLeads: { select: { id: true } } } } },
        });
        if (branchUsers.length > 0) {
          const sorted = branchUsers.sort((a, b) =>
            a.user.assignedLeads.length - b.user.assignedLeads.length
          );
          resolvedCounselorId = sorted[0].user.id;
        }
      } else if (assignmentMethod === "COURSE_BASED" && lead.student.interestedCourse) {
        // Assign to counselor who has most students with same interested course
        const branchUsers = await prisma.agencyUser.findMany({
          where: { branchId, user: { isActive: true, role: "AGENCY_COUNSELOR" } },
          include: {
            user: {
              include: {
                assignedLeads: {
                  include: { student: { select: { interestedCourse: true } } },
                },
              },
            },
          },
        });
        const course = lead.student.interestedCourse;
        let best = null;
        let bestCount = -1;
        for (const bu of branchUsers) {
          const count = bu.user.assignedLeads.filter(l => l.student.interestedCourse === course).length;
          if (count > bestCount) { bestCount = count; best = bu; }
        }
        if (best) resolvedCounselorId = best.user.id;
      }
    } else if (!branchId && agencyId) {
      // BRANCH_BASED: pick active branch with fewest leads
      const branches = await prisma.agencyBranch.findMany({
        where: { agencyId, status: "ACTIVE" },
        include: { _count: { select: { leads: true } } },
      });
      if (branches.length > 0) {
        const sorted = branches.sort((a, b) => a._count.leads - b._count.leads);
        resolvedBranchId = sorted[0].id;
      }
    }

    // Update lead
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        ...(resolvedBranchId && { branchId: resolvedBranchId }),
        ...(resolvedCounselorId && { assignedToId: resolvedCounselorId }),
      },
    });

    // Also update student branch/agency
    if (resolvedBranchId || agencyId) {
      await prisma.student.update({
        where: { id: lead.studentId },
        data: {
          ...(agencyId && { agencyId }),
          ...(resolvedBranchId && { branchId: resolvedBranchId }),
        },
      });
    }

    return NextResponse.json({ success: true, branchId: resolvedBranchId, counselorId: resolvedCounselorId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
