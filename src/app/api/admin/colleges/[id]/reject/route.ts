import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const reason: string = body.reason ?? "Does not meet platform requirements";

    const college = await prisma.college.findUnique({ where: { id }, include: { admin: true } });
    if (!college) return NextResponse.json({ error: "College not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.college.update({
        where: { id },
        data: { status: "REJECTED", rejectionReason: reason },
      });

      if (college.adminId) {
        await tx.notification.create({
          data: {
            userId: college.adminId,
            type: "WARNING",
            title: "Registration Rejected",
            message: `Your institution ${college.name} was not approved. Reason: ${reason}`,
            resourceId: id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "REJECT_COLLEGE",
          resource: "college",
          resourceId: id,
          newValue: { collegeName: college.name, reason },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Rejection failed" }, { status: 500 });
  }
}
