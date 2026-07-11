import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { NotificationMessages } from "@/lib/notifications";
import { z } from "zod";

const schema = z.object({
  // null clears the assignment (moves the agency to the unassigned queue).
  suggBranchId: z.string().nullable(),
});

/**
 * PUT /api/admin/agencies/[id]/sugg-branch
 * Reassign an agency to a different Sugg Branch (or unassign). Audited, and the
 * receiving Sugg Branch Manager is notified.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const { suggBranchId } = schema.parse(await request.json());

    const agency = await prisma.agency.findUnique({
      where: { id },
      select: { id: true, name: true, suggBranchId: true },
    });
    if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

    let branch: { id: string; managerId: string | null; branchName: string } | null = null;
    if (suggBranchId) {
      branch = await prisma.suggBranch.findUnique({
        where: { id: suggBranchId },
        select: { id: true, managerId: true, branchName: true, status: true },
      });
      if (!branch) return NextResponse.json({ error: "Sugg Branch not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.agency.update({ where: { id }, data: { suggBranchId } });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "REASSIGN_AGENCY_SUGG_BRANCH",
          resource: "agency",
          resourceId: id,
          oldValue: { suggBranchId: agency.suggBranchId },
          newValue: { suggBranchId },
        },
      });

      if (branch?.managerId) {
        const msg = NotificationMessages.newAgencyInTerritory(agency.name);
        await tx.notification.create({
          data: {
            userId: branch.managerId,
            type: "AGENCY_ASSIGNED_SUGG_BRANCH",
            title: msg.title,
            message: msg.message,
            resourceId: id,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[PUT agency sugg-branch]", err);
    return NextResponse.json({ error: "Failed to reassign agency" }, { status: 500 });
  }
}
