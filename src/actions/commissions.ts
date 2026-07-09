"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { createBulkNotifications } from "@/lib/notifications";
import {
  calculateCourseCommission,
  parseSlabRules,
} from "@/lib/commission-calculator";

/**
 * Create a commission transaction when an admission is confirmed.
 * Commission config is sourced from the course record (course-level rules take priority).
 * Fallback params can be supplied when course has no commission configured.
 */
export async function createCommissionTransaction(params: {
  applicationId: string;
  tuitionAmount: number;
  // Optional fallback when course has no commission config
  commissionType?: "FIXED" | "PERCENTAGE" | "SLAB";
  commissionRate?: number;
}) {
  const user = await requireRole(["SUPER_ADMIN", "COLLEGE_ADMIN"]);

  const application = await prisma.application.findUnique({
    where: { id: params.applicationId },
    include: {
      student: {
        include: { referral: { include: { agency: true } } },
      },
      college: true,
      course: true, // fetch course to read commission config
    },
  });

  if (!application) return { error: "Application not found" };
  if (application.status !== "ENROLLED") {
    return { error: "Commission can only be created for enrolled students" };
  }

  const existingCommission = await prisma.commissionTransaction.findUnique({
    where: { applicationId: params.applicationId },
  });
  if (existingCommission) {
    return { error: "Commission already exists for this application" };
  }

  // ── Commission calculation: course-level config is source of truth ──
  let commissionAmount = 0;
  let type: "FIXED" | "PERCENTAGE" | "SLAB" = "PERCENTAGE";
  let rate = 0;

  const course = application.course;
  if (course?.commissionType) {
    const result = calculateCourseCommission(
      {
        commissionType: course.commissionType as "FIXED" | "PERCENTAGE" | "SLAB",
        commissionValue: Number(course.commissionValue ?? 0),
        commissionRules: parseSlabRules(course.commissionRules),
      },
      params.tuitionAmount,
      course.commissionCurrency
    );
    if (result) {
      commissionAmount = result.commissionAmount;
      type = course.commissionType as "FIXED" | "PERCENTAGE" | "SLAB";
      rate = result.appliedRate ?? Number(course.commissionValue ?? 0);
    }
  } else if (params.commissionType) {
    // Fallback to caller-supplied config
    type = params.commissionType;
    rate = params.commissionRate ?? 5;
    const result = calculateCourseCommission(
      { commissionType: type, commissionValue: rate, commissionRules: null },
      params.tuitionAmount
    );
    commissionAmount = result?.commissionAmount ?? 0;
  } else {
    // Last-resort default: 5% of tuition
    rate = 5;
    commissionAmount = parseFloat(((params.tuitionAmount * 5) / 100).toFixed(2));
  }

  const transaction = await prisma.commissionTransaction.create({
    data: {
      applicationId: params.applicationId,
      agencyId: application.student.referral?.agencyId ?? null,
      collegeId: application.collegeId,
      type,
      tuitionAmount: params.tuitionAmount,
      commissionRate: rate,
      commissionAmount,
      status: "PENDING",
    },
  });

  // Notify agency admin if referral-based
  if (application.student.referral?.agency) {
    const agencyAdmins = await prisma.user.findMany({
      where: { agencyId: application.student.referral.agencyId, role: "AGENCY_ADMIN" } as never,
    });

    if (agencyAdmins.length) {
      await createBulkNotifications(
        agencyAdmins.map((a) => a.id),
        {
          type: "COMMISSION_APPROVED",
          title: "Commission Created",
          message: `Commission of ${formatCurrency(commissionAmount)} created for ${application.student.name}`,
          resourceId: transaction.id,
        }
      );
    }
  }

  revalidatePath("/admin/commissions");
  return { success: true, transactionId: transaction.id, commissionAmount };
}

/**
 * Approve a pending commission transaction.
 */
export async function approveCommission(transactionId: string) {
  const user = await requireRole(["SUPER_ADMIN"]);

  const transaction = await prisma.commissionTransaction.findUnique({
    where: { id: transactionId },
    include: {
      agency: { include: { owner: true } },
    },
  });

  if (!transaction) return { error: "Transaction not found" };
  if (transaction.status !== "PENDING") {
    return { error: "Only pending commissions can be approved" };
  }

  await prisma.commissionTransaction.update({
    where: { id: transactionId },
    data: {
      status: "APPROVED",
      approvedById: user.id,
      approvedAt: new Date(),
    },
  });

  // Notify agency owner
  if (transaction.agency?.ownerId) {
    await createBulkNotifications([transaction.agency.ownerId], {
      type: "COMMISSION_APPROVED",
      title: "Commission Approved",
      message: `Your commission of ${formatCurrency(Number(transaction.commissionAmount))} has been approved`,
      resourceId: transactionId,
    });
  }

  revalidatePath("/admin/commissions");
  revalidatePath("/agency/commissions");
  return { success: true };
}

/**
 * Process a payout for approved commissions.
 */
export async function processCommissionPayout(params: {
  agencyId: string;
  transactionIds: string[];
  paymentMethod?: string;
  referenceNo?: string;
  notes?: string;
}) {
  await requireRole(["SUPER_ADMIN"]);

  // Verify all transactions are approved
  const transactions = await prisma.commissionTransaction.findMany({
    where: {
      id: { in: params.transactionIds },
      agencyId: params.agencyId,
      status: "APPROVED",
      payoutId: null,
    },
  });

  if (transactions.length !== params.transactionIds.length) {
    return { error: "Some transactions are not eligible for payout" };
  }

  const totalAmount = transactions.reduce(
    (sum, t) => sum + Number(t.commissionAmount),
    0
  );

  const payout = await prisma.commissionPayout.create({
    data: {
      agencyId: params.agencyId,
      totalAmount,
      paymentMethod: params.paymentMethod,
      referenceNo: params.referenceNo,
      notes: params.notes,
      paidAt: new Date(),
    },
  });

  // Update transactions
  await prisma.commissionTransaction.updateMany({
    where: { id: { in: params.transactionIds } },
    data: { status: "PAID", payoutId: payout.id },
  });

  // Notify agency owner
  const agency = await prisma.agency.findUnique({
    where: { id: params.agencyId },
    include: { owner: true },
  });

  if (agency?.ownerId) {
    await createBulkNotifications([agency.ownerId], {
      type: "COMMISSION_PAID",
      title: "Commission Paid",
      message: `Payout of ${formatCurrency(totalAmount)} has been processed`,
      resourceId: payout.id,
    });
  }

  revalidatePath("/admin/commissions");
  revalidatePath("/admin/payouts");
  revalidatePath("/agency/commissions");
  revalidatePath("/agency/payouts");

  return { success: true, payoutId: payout.id, totalAmount };
}
