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
    const college = await prisma.college.findUnique({
      where: { id },
      include: { admin: true },
    });
    if (!college) return NextResponse.json({ error: "College not found" }, { status: 404 });
    if (college.status === "APPROVED") {
      return NextResponse.json({ error: "College is already approved" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Approve the college
      await tx.college.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedById: user.id,
        },
      });

      // Activate the admin user
      if (college.adminId) {
        await tx.user.update({
          where: { id: college.adminId },
          data: { isActive: true },
        });
      }

      // Send notification to college admin
      if (college.adminId) {
        await tx.notification.create({
          data: {
            userId: college.adminId,
            type: "SUCCESS",
            title: "College Approved!",
            message: `Your institution ${college.name} has been approved. You can now log in to your dashboard.`,
            resourceId: id,
          },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "APPROVE_COLLEGE",
          resource: "college",
          resourceId: id,
          newValue: { collegeName: college.name },
        },
      });
    });

    return NextResponse.json({ success: true, message: `${college.name} has been approved.` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }
}
