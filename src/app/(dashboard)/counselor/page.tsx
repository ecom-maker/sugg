import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CounselorDashboard } from "@/components/dashboard/counselor/counselor-dashboard";
import { startOfDay, subDays } from "date-fns";

export const metadata: Metadata = {
  title: "Counselor Dashboard",
};

export default async function CounselorPage() {
  const user = await requireRole(["SUGG_COUNSELOR", "SUPER_ADMIN"]);

  const today = startOfDay(new Date());
  const sevenDaysAgo = subDays(today, 7);

  const [
    totalLeads,
    contactedLeads,
    confirmedAdmissions,
    pendingFollowups,
    overdueFollowups,
    recentLeads,
  ] = await Promise.all([
    prisma.lead.count({
      where: { assignedToId: user.id },
    }),
    prisma.lead.count({
      where: {
        assignedToId: user.id,
        status: { notIn: ["NEW", "LOST"] },
      },
    }),
    prisma.lead.count({
      where: {
        assignedToId: user.id,
        status: "ADMISSION_CONFIRMED",
      },
    }),
    prisma.leadFollowup.count({
      where: {
        userId: user.id,
        status: "PENDING",
        dueAt: { gte: today },
      },
    }),
    prisma.leadFollowup.count({
      where: {
        userId: user.id,
        status: "PENDING",
        dueAt: { lt: today },
      },
    }),
    prisma.lead.findMany({
      where: {
        assignedToId: user.id,
        createdAt: { gte: sevenDaysAgo },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        student: {
          select: {
            name: true,
            mobile: true,
            interestedCourse: true,
            city: true,
          },
        },
      },
    }),
  ]);

  const stats = {
    totalLeads,
    contactedLeads,
    confirmedAdmissions,
    pendingFollowups,
    overdueFollowups,
    conversionRate:
      totalLeads > 0
        ? Number(((confirmedAdmissions / totalLeads) * 100).toFixed(1))
        : 0,
  };

  return <CounselorDashboard stats={stats} recentLeads={recentLeads} />;
}
