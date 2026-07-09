import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CounselorDashboard } from "@/components/dashboard/counselor/counselor-dashboard";
import { startOfDay, subDays } from "date-fns";

export const metadata: Metadata = {
  title: "Counselor Dashboard",
};

export default async function CounselorPage() {
  const user = await requireRole(["SUGG_COUNSELOR", "AGENCY_COUNSELOR", "SUPER_ADMIN"]);

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

  // Team context for agency counselors
  let teamContext: {
    teamName: string;
    teamLeadName: string | null;
    branchName: string | null;
    geoBreadcrumb: string[];
    teamRank: number | null;
  } | null = null;

  if (user.role === "AGENCY_COUNSELOR") {
    const agencyUser = await prisma.agencyUser.findUnique({
      where: { userId: user.id },
      include: {
        branch: {
          include: {
            geoDistrict: { include: { state: { include: { country: true } } } },
          },
        },
        teamMemberships: {
          where: { status: "ACTIVE" },
          include: {
            team: {
              include: {
                teamLead: { include: { user: { select: { fullName: true } } } },
                members: {
                  where: { status: "ACTIVE" },
                  include: { counselor: { include: { user: { select: { id: true } } } } },
                },
              },
            },
          },
        },
      },
    });

    const membership = agencyUser?.teamMemberships[0];
    if (membership?.team) {
      const team = membership.team;
      const geo = agencyUser?.branch?.geoDistrict;
      const breadcrumb = geo
        ? [geo.state.country.countryName, geo.state.stateName, geo.districtName]
        : agencyUser?.branch
        ? [agencyUser.branch.country ?? "", agencyUser.branch.state ?? "", agencyUser.branch.city ?? ""].filter(Boolean)
        : [];

      // Rank by conversion rate within team
      const memberRates = await Promise.all(
        team.members.map(async (m) => {
          const total = await prisma.lead.count({ where: { assignedToId: m.counselor.user.id } });
          const confirmed = await prisma.lead.count({
            where: { assignedToId: m.counselor.user.id, status: "ADMISSION_CONFIRMED" },
          });
          return {
            userId: m.counselor.user.id,
            rate: total > 0 ? confirmed / total : 0,
          };
        })
      );
      memberRates.sort((a, b) => b.rate - a.rate);
      const rank = memberRates.findIndex((m) => m.userId === user.id) + 1;

      teamContext = {
        teamName: team.teamName,
        teamLeadName: team.teamLead?.user.fullName ?? null,
        branchName: agencyUser?.branch?.branchName ?? null,
        geoBreadcrumb: breadcrumb,
        teamRank: rank > 0 ? rank : null,
      };
    }
  }

  return <CounselorDashboard stats={stats} recentLeads={recentLeads} teamContext={teamContext} />;
}
