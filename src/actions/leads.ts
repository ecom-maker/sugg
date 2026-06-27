"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { assignLeadToNextCounselor, manualAssignLead } from "@/lib/lead-assignment";
import { calculateLeadScore } from "@/lib/utils";
import { createNotification, NotificationMessages } from "@/lib/notifications";
import type { LeadStatus } from "@/types";

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
  const existing = await prisma.student.findFirst({
    where: { mobile: data.mobile },
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
      email: data.email || null,
      city: data.city || null,
      country: data.country || null,
      educationLevel: data.educationLevel || null,
      qualification: data.qualification || null,
      interestedCourse: data.interestedCourse || null,
      preferredCollege: data.preferredCollege || null,
      preferredCountry: data.preferredCountry || null,
      budget: data.budget ? parseFloat(data.budget) : null,
      source: data.source,
    },
  });

  const lead = await prisma.lead.create({
    data: {
      studentId: student.id,
      source: data.source,
      status: "NEW",
      score,
    },
  });

  // Auto-assign if manual entry
  if (data.source === "MANUAL_ENTRY") {
    await assignLeadToNextCounselor(lead.id, data.interestedCourse);
  }

  revalidatePath("/counselor/leads");
  revalidatePath("/admin/leads");

  return { success: true, leadId: lead.id };
}

export async function updateLeadStatus(leadId: string, status: LeadStatus, reason?: string) {
  const user = await requireAuth();

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { student: true },
  });

  if (!lead) return { error: "Lead not found" };

  // Counselors can only update their own leads
  if (user.role === "SUGG_COUNSELOR" && lead.assignedToId !== user.id) {
    return { error: "Unauthorized" };
  }

  const updateData: Record<string, unknown> = {
    status,
    lastContactedAt: new Date(),
  };

  if (status === "CONTACTED" || status === "COUNSELING_SCHEDULED") {
    updateData.lastContactedAt = new Date();
  }

  if (status === "LOST") {
    updateData.lostReason = reason;
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: updateData,
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "UPDATE_STATUS",
      resource: "lead",
      resourceId: leadId,
      newValue: { status },
    },
  });

  revalidatePath(`/counselor/leads/${leadId}`);
  revalidatePath("/counselor/leads");

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
