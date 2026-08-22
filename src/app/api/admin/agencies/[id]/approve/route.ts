import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { ensureHeadOfficeBranch, activatePendingAgencyUsers } from "@/lib/agency-onboarding";

/**
 * POST /api/admin/agencies/[id]/approve
 * Approves an agency: activates its owner (+ pre-created manager), auto-creates
 * a default Head Office branch, and notifies the owner.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const reason: string | undefined = body.reason;
    const agency = await prisma.agency.findUnique({ where: { id } });
    if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    if (agency.approvalStatus === "APPROVED") {
      return NextResponse.json({ error: "Agency is already approved" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.agency.update({
        where: { id },
        data: {
          approvalStatus: "APPROVED",
          approvedById: user.id,
          approvedAt: new Date(),
          isActive: true,
          rejectionReason: null,
        },
      });

      await activatePendingAgencyUsers(tx, id);
      await ensureHeadOfficeBranch(tx, agency);

      if (agency.ownerId) {
        await tx.notification.create({
          data: {
            userId: agency.ownerId,
            type: "AGENCY_APPROVED",
            title: "Agency Approved!",
            message: `${agency.name} has been approved. You can now log in and set up your agency.`,
            resourceId: id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "APPROVE_AGENCY",
          resource: "agency",
          resourceId: id,
          newValue: { name: agency.name, reason: reason ?? null },
        },
      });
    });

    return NextResponse.json({ success: true, message: `${agency.name} has been approved.` });
  } catch (err) {
    console.error("[approve agency]", err);
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }
}
