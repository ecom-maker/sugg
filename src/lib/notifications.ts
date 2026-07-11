import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      resourceId: params.resourceId,
    },
  });
}

export async function createBulkNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
) {
  return prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      message: params.message,
      resourceId: params.resourceId,
    })),
  });
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

// Notification templates
export const NotificationMessages = {
  newLeadAssigned: (studentName: string) => ({
    title: "New Lead Assigned",
    message: `You have been assigned a new lead: ${studentName}`,
  }),

  followUpReminder: (studentName: string, dueDate: Date) => ({
    title: "Follow-up Reminder",
    message: `Reminder: Follow up with ${studentName} by ${dueDate.toLocaleDateString()}`,
  }),

  newApplication: (studentName: string, collegeName: string) => ({
    title: "New Application Received",
    message: `${studentName} has applied to ${collegeName}`,
  }),

  applicationStatusChanged: (studentName: string, newStatus: string) => ({
    title: "Application Status Updated",
    message: `${studentName}'s application status changed to ${newStatus}`,
  }),

  commissionApproved: (amount: string) => ({
    title: "Commission Approved",
    message: `Your commission of ${amount} has been approved`,
  }),

  collegeApproved: (collegeName: string) => ({
    title: "College Approved",
    message: `${collegeName} has been approved on the platform`,
  }),

  // ─── Sugg Branch Network ───────────────────────────────────────────────────

  newAgencyInTerritory: (agencyName: string) => ({
    title: "New Agency in Your Territory",
    message: `${agencyName} has registered in your territory and is awaiting your recommendation`,
  }),

  unassignedTerritoryAgency: (agencyName: string) => ({
    title: "Agency in Unassigned Territory",
    message: `${agencyName} registered in a territory not covered by any Sugg Branch`,
  }),

  agencyDecisionForManager: (agencyName: string, decision: "approved" | "rejected") => ({
    title: `Agency ${decision === "approved" ? "Approved" : "Rejected"}`,
    message: `${agencyName} in your territory has been ${decision} by the Super Admin`,
  }),

  agencyRecommendationSubmitted: (agencyName: string, recommendation: string) => ({
    title: "Agency Recommendation Submitted",
    message: `A Sugg Branch Manager recommends to ${recommendation} ${agencyName}`,
  }),

  agencySuspensionRecommended: (agencyName: string, reason: string) => ({
    title: "Agency Suspension Recommended",
    message: `A Sugg Branch Manager recommends suspending ${agencyName}. Reason: ${reason}`,
  }),

  coveringSuggBranch: (branchName: string, contact: string) => ({
    title: "Your Regional Sugg Branch",
    message: `Your agency is now managed by ${branchName}. Regional contact: ${contact}`,
  }),

  territoryReportReady: (period: string) => ({
    title: "Territory Report Ready",
    message: `Your territory report for ${period} is ready to view`,
  }),
};
