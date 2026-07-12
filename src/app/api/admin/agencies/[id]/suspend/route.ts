import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/**
 * POST /api/admin/agencies/[id]/suspend  { reason? }
 * Suspends an agency. Its users are blocked at login while suspended.
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

    await prisma.$transaction(async (tx) => {
      await tx.agency.update({
        where: { id },
        data: { approvalStatus: "SUSPENDED" },
      });

      if (agency.ownerId) {
        await tx.notification.create({
          data: {
            userId: agency.ownerId,
            type: "AGENCY_SUSPENDED",
            title: "Agency Suspended",
            message: `${agency.name} has been suspended.${reason ? ` Reason: ${reason}` : ""}`,
            resourceId: id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "SUSPEND_AGENCY",
          resource: "agency",
          resourceId: id,
          newValue: { name: agency.name, reason: reason ?? null },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[suspend agency]", err);
    return NextResponse.json({ error: "Suspension failed" }, { status: 500 });
  }
}
