"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { getCurrentLeadRecord } from "@/lib/student-lead";
import { createBulkNotifications, NotificationMessages } from "@/lib/notifications";
import type { ApplicationStatus } from "@/types";

const createApplicationSchema = z.object({
  studentId: z.string().min(1),
  collegeId: z.string().min(1),
  courseId: z.string().min(1),
  managedBy: z.enum(["SUGG", "COLLEGE"]).default("SUGG"),
  applicationFee: z.string().optional(),
  notes: z.string().optional(),
});

export async function createApplication(formData: FormData) {
  const user = await requireRole(["SUGG_COUNSELOR", "SUPER_ADMIN"]);

  const raw = Object.fromEntries(formData.entries());
  const parsed = createApplicationSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // Check for duplicate application
  const existing = await prisma.application.findFirst({
    where: {
      studentId: data.studentId,
      collegeId: data.collegeId,
      courseId: data.courseId,
      status: { notIn: ["REJECTED"] },
    },
  });

  if (existing) {
    return { error: { general: ["Student has already applied to this course at this college"] } };
  }

  const application = await prisma.application.create({
    data: {
      studentId: data.studentId,
      collegeId: data.collegeId,
      courseId: data.courseId,
      status: "SUBMITTED",
      submittedById: user.id,
      managedBy: data.managedBy,
      applicationFee: data.applicationFee ? parseFloat(data.applicationFee) : null,
      notes: data.notes || null,
    },
    include: {
      student: { select: { name: true } },
      college: { select: { name: true, adminId: true } },
    },
  });

  // Create initial status history
  await prisma.applicationStatusHistory.create({
    data: {
      applicationId: application.id,
      status: "SUBMITTED",
      changedById: user.id,
      notes: "Application submitted",
    },
  });

  // Update lead status
  const lead = await getCurrentLeadRecord(data.studentId);

  if (lead) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "APPLICATION_SUBMITTED" },
    });
  }

  // Notify college admin
  if (application.college.adminId) {
    await createBulkNotifications([application.college.adminId], {
      type: "NEW_APPLICATION",
      ...NotificationMessages.newApplication(
        application.student.name,
        application.college.name
      ),
      resourceId: application.id,
    });
  }

  revalidatePath("/counselor/applications");
  revalidatePath("/college/applications");
  revalidatePath("/admin/applications");

  return { success: true, applicationId: application.id };
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  options?: { notes?: string; reason?: string }
) {
  const user = await requireAuth();

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      student: { select: { name: true } },
      college: { select: { name: true, adminId: true } },
    },
  });

  if (!application) return { error: "Application not found" };

  // Authorization check
  if (user.role === "COLLEGE_ADMIN") {
    const college = await prisma.college.findUnique({
      where: { id: application.collegeId, adminId: user.id },
    });
    if (!college) return { error: "Unauthorized" };
  }

  const oldStatus = application.status;

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      status,
      enrolledAt: status === "ENROLLED" ? new Date() : undefined,
    },
  });

  // Status history
  await prisma.applicationStatusHistory.create({
    data: {
      applicationId,
      status,
      changedById: user.id,
      reason: options?.reason,
      notes: options?.notes,
    },
  });

  // Update lead status
  const lead = await getCurrentLeadRecord(application.studentId);

  if (lead) {
    const leadStatus = (() => {
      switch (status) {
        case "ACCEPTED": return "OFFER_RECEIVED";
        case "ENROLLED": return "ADMISSION_CONFIRMED";
        case "REJECTED": return lead.status; // Keep current lead status
        default: return lead.status;
      }
    })();

    if (leadStatus !== lead.status) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: leadStatus },
      });
    }
  }

  // Notify relevant parties
  const notifyUserIds: string[] = [];

  // Notify counselor who submitted
  if (application.submittedById && application.submittedById !== user.id) {
    notifyUserIds.push(application.submittedById);
  }

  if (notifyUserIds.length) {
    await createBulkNotifications(notifyUserIds, {
      type: "APPLICATION_STATUS_CHANGED",
      ...NotificationMessages.applicationStatusChanged(
        application.student.name,
        status
      ),
      resourceId: applicationId,
    });
  }

  revalidatePath("/college/applications");
  revalidatePath("/counselor/applications");
  revalidatePath("/admin/applications");

  return { success: true };
}
