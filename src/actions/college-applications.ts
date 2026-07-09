"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateApplicationStatus(applicationId: string, newStatus: string) {
  const user = await getAuthUser();
  if (!user || !["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return { error: "Unauthorized" };
  }

  const validStatuses = ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "ENROLLED"];
  if (!validStatuses.includes(newStatus)) {
    return { error: "Invalid status" };
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { college: { select: { adminId: true, name: true } } },
  });

  if (!application) return { error: "Application not found" };

  // RBAC: College admin can only update their own college's applications
  if (user.role === "COLLEGE_ADMIN") {
    const collegeUser = await prisma.user.findFirst({
      where: { supabaseId: user.supabaseId },
    });
    if (application.college.adminId !== collegeUser?.id) {
      return { error: "Access denied" };
    }
  }

  const previousStatus = application.status;

  await prisma.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: applicationId },
      data: {
        status: newStatus as never,
        ...(newStatus === "ENROLLED" ? { enrolledAt: new Date() } : {}),
      },
    });

    // History
    await tx.applicationStatusHistory.create({
      data: {
        applicationId,
        status: newStatus as never,
        changedById: user.id,
        notes: `Status changed from ${previousStatus} to ${newStatus}`,
      },
    });

    // Notify counselor who submitted the application
    if (application.submittedById && (newStatus === "ACCEPTED" || newStatus === "ENROLLED" || newStatus === "REJECTED")) {
      await tx.notification.create({
        data: {
          userId: application.submittedById,
          type: newStatus === "REJECTED" ? "WARNING" : "SUCCESS",
          title: `Application ${newStatus.replace(/_/g, " ")}`,
          message: `Application at ${application.college.name} has been ${newStatus.toLowerCase().replace(/_/g, " ")}.`,
          resourceId: applicationId,
        },
      });
    }
  });

  revalidatePath("/college/applications");
  revalidatePath("/admin/applications");
  return { success: true };
}
