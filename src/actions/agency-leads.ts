"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getHierarchyScope } from "@/lib/hierarchy-scope";
import { normalizeMobileE164 } from "@/lib/mobile-normalize";
import { calculateLeadScore } from "@/lib/utils";
import { createNotification, NotificationMessages } from "@/lib/notifications";

const createSchema = z.object({
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
  budgetMin: z.string().optional(),
  expectedClosingDate: z.string().optional(),
  // Owner/Admin may target a branch; counselor/branch-manager use their own.
  branchId: z.string().optional(),
});

/**
 * Agency-side lead creation: creates a student (source AGENCY_REFERRAL, scoped
 * to the creator's agency/branch), a lead assigned to the creator by default,
 * and a StudentReferral. Dedup-checked on normalized mobile.
 */
export async function createAgencyLead(formData: FormData) {
  const user = await requireRole([
    "AGENCY_OWNER",
    "AGENCY_ADMIN",
    "BRANCH_MANAGER",
    "AGENCY_COUNSELOR",
  ]);
  const scope = await getHierarchyScope(user);
  if (!scope.agencyId) return { error: "No agency context for this user" };

  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  const normalizedMobile = normalizeMobileE164(data.mobile);
  const existing = await prisma.student.findFirst({
    where: { OR: [{ mobile: data.mobile }, { mobileNumberNormalized: normalizedMobile }] },
    select: { id: true },
  });
  if (existing) {
    return { error: { mobile: ["A student with this phone number already exists"] } };
  }

  // Resolve the branch: owner/admin may pick any branch in their agency;
  // branch manager / counselor use their own branch.
  let branchId = scope.branchId ?? null;
  if ((user.role === "AGENCY_OWNER" || user.role === "AGENCY_ADMIN") && data.branchId) {
    const b = await prisma.agencyBranch.findFirst({
      where: { id: data.branchId, agencyId: scope.agencyId },
      select: { id: true },
    });
    branchId = b?.id ?? null;
  }

  const score = calculateLeadScore({
    hasEmail: !!data.email,
    hasCity: !!data.city,
    hasBudget: !!data.budget,
    hasQualification: !!data.qualification,
    hasPreferredCollege: !!data.preferredCollege,
    source: "AGENCY_REFERRAL",
  });

  const lead = await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        name: data.name,
        mobile: data.mobile,
        mobileNumberNormalized: normalizedMobile,
        email: data.email || null,
        city: data.city || null,
        country: data.country || null,
        educationLevel: data.educationLevel || null,
        qualification: data.qualification || null,
        interestedCourse: data.interestedCourse || null,
        preferredCollege: data.preferredCollege || null,
        preferredCountry: data.preferredCountry || null,
        budget: data.budget ? parseFloat(data.budget) : null,
        budgetMin: data.budgetMin ? parseFloat(data.budgetMin) : null,
        source: "AGENCY_REFERRAL",
        agencyId: scope.agencyId,
        branchId,
      },
    });

    const createdLead = await tx.lead.create({
      data: {
        studentId: student.id,
        source: "AGENCY_REFERRAL",
        status: "NEW",
        score,
        isCurrent: true,
        assignedToId: user.id, // default: creating counselor
        branchId,
        assignmentRule: "MANUAL",
        expectedClosingDate: data.expectedClosingDate ? new Date(data.expectedClosingDate) : null,
      },
    });

    await tx.studentReferral.create({
      data: { agencyId: scope.agencyId!, studentId: student.id, referredById: user.id },
    });

    await tx.leadStatusHistory.create({
      data: { leadId: createdLead.id, fromStatus: null, toStatus: "NEW", changedById: user.id },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_AGENCY_LEAD",
        resource: "lead",
        resourceId: createdLead.id,
        newValue: { studentName: student.name, agencyId: scope.agencyId, branchId },
      },
    });

    return createdLead;
  });

  revalidatePath("/agency/leads");
  return { success: true, leadId: lead.id };
}

/**
 * Reassign an agency lead. Branch Managers may only reassign within their own
 * branch; Agency Owner/Admin may reassign across branches (audited).
 */
export async function reassignAgencyLead(leadId: string, counselorUserId: string) {
  const user = await requireRole(["AGENCY_OWNER", "AGENCY_ADMIN", "BRANCH_MANAGER"]);
  const scope = await getHierarchyScope(user);
  if (!scope.agencyId) return { error: "No agency context for this user" };

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { student: { select: { agencyId: true, name: true } } },
  });
  if (!lead) return { error: "Lead not found" };
  if (lead.student.agencyId !== scope.agencyId) return { error: "Lead is not in your agency" };

  const target = await prisma.agencyUser.findUnique({
    where: { userId: counselorUserId },
    select: { agencyId: true, branchId: true },
  });
  if (!target || target.agencyId !== scope.agencyId) {
    return { error: "The selected counselor is not in your agency" };
  }

  if (user.role === "BRANCH_MANAGER") {
    if (lead.branchId !== scope.branchId || target.branchId !== scope.branchId) {
      return { error: "Branch Managers can only reassign within their own branch" };
    }
  }

  const crossBranch = Boolean(lead.branchId && target.branchId && lead.branchId !== target.branchId);

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: {
        assignedToId: counselorUserId,
        branchId: target.branchId ?? lead.branchId,
        assignmentRule: "MANUAL",
      },
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: crossBranch ? "REASSIGN_LEAD_CROSS_BRANCH" : "REASSIGN_LEAD",
        resource: "lead",
        resourceId: leadId,
        oldValue: { assignedToId: lead.assignedToId, branchId: lead.branchId },
        newValue: { assignedToId: counselorUserId, branchId: target.branchId ?? lead.branchId },
      },
    });
  });

  await createNotification({
    userId: counselorUserId,
    type: "NEW_LEAD_ASSIGNED",
    ...NotificationMessages.newLeadAssigned(lead.student.name),
    resourceId: leadId,
  });

  revalidatePath("/agency/leads");
  revalidatePath(`/agency/leads/${leadId}`);
  return { success: true };
}
