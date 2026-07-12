import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/**
 * POST /api/admin/agencies/[id]/reject  { reason }
 * Rejects an agency and notifies the owner with the reason.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const reason: string = body.reason ?? "Does not meet platform requirements";

    const agency = await prisma.agency.findUnique({ where: { id } });
    if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.agency.update({
        where: { id },
        data: { approvalStatus: "REJECTED", rejectionReason: reason },
      });

      if (agency.ownerId) {
        await tx.notification.create({
          data: {
            userId: agency.ownerId,
            type: "AGENCY_REJECTED",
            title: "Registration Rejected",
            message: `${agency.name} was not approved. Reason: ${reason}`,
            resourceId: id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "REJECT_AGENCY",
          resource: "agency",
          resourceId: id,
          newValue: { name: agency.name, reason },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reject agency]", err);
    return NextResponse.json({ error: "Rejection failed" }, { status: 500 });
  }
}
