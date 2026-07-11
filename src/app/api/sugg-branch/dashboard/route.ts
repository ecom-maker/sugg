import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getSuggBranchScope, getScopedAgencyIds, scopedLeadWhere } from "@/lib/sugg-branch-scope";

/**
 * GET /api/sugg-branch/dashboard
 * Territory KPIs for the signed-in Sugg Branch Manager.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role !== "SUGG_BRANCH_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = await getSuggBranchScope(user);
  if (!scope) {
    return NextResponse.json({ error: "No Sugg Branch assigned to this manager" }, { status: 404 });
  }

  const agencyIds = await getScopedAgencyIds(scope.suggBranchId);
  const leadWhere = await scopedLeadWhere(scope.suggBranchId);

  const [
    agencyStatusGroups,
    pendingRecommendations,
    totalLeads,
    admissions,
    commissionAgg,
    suggCounselors,
    agencies,
  ] = await Promise.all([
    prisma.agency.groupBy({
      by: ["approvalStatus"],
      where: { suggBranchId: scope.suggBranchId },
      _count: { id: true },
    }),
    prisma.agency.count({
      where: { suggBranchId: scope.suggBranchId, approvalStatus: "PENDING", recommendedAt: null },
    }),
    prisma.lead.count({ where: leadWhere as never }),
    prisma.lead.count({ where: { AND: [leadWhere, { status: "ADMISSION_CONFIRMED" }] } as never }),
    prisma.commissionTransaction.aggregate({
      where: { agencyId: { in: agencyIds } },
      _sum: { commissionAmount: true },
    }),
    prisma.counselor.count({ where: { suggBranchId: scope.suggBranchId } }),
    prisma.agency.findMany({
      where: { suggBranchId: scope.suggBranchId },
      select: { id: true, name: true, approvalStatus: true },
    }),
  ]);

  // Per-agency comparison (top / bottom performers by admissions).
  const comparison = await Promise.all(
    agencies.map(async (a) => {
      const [leads, admits] = await Promise.all([
        prisma.lead.count({ where: { student: { agencyId: a.id } } }),
        prisma.lead.count({
          where: { student: { agencyId: a.id }, status: "ADMISSION_CONFIRMED" },
        }),
      ]);
      return {
        agencyId: a.id,
        name: a.name,
        leads,
        admissions: admits,
        conversionRate: leads > 0 ? Number(((admits / leads) * 100).toFixed(1)) : 0,
      };
    })
  );
  const ranked = [...comparison].sort((a, b) => b.admissions - a.admissions);

  const agenciesByStatus = agencyStatusGroups.reduce<Record<string, number>>((acc, g) => {
    acc[g.approvalStatus] = g._count.id;
    return acc;
  }, {});

  return NextResponse.json({
    branch: { id: scope.suggBranchId, name: scope.branchName },
    summary: {
      agenciesByStatus,
      totalAgencies: agencies.length,
      pendingRecommendations,
      totalLeads,
      admissions,
      commissionGenerated: Number(commissionAgg._sum.commissionAmount ?? 0),
      suggCounselors,
      conversionRate: totalLeads > 0 ? Number(((admissions / totalLeads) * 100).toFixed(1)) : 0,
    },
    topAgencies: ranked.slice(0, 5),
    bottomAgencies: ranked.slice(-5).reverse(),
  });
}
