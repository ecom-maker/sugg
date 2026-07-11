import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import {
  getSuggBranchScope,
  getScopedAgencyIds,
  scopedLeadWhere,
} from "@/lib/sugg-branch-scope";

// Territory-level reports for the Sugg Branch Manager. Phase 1 returns JSON;
// CSV/XLSX export (?format=) is layered on in Phase 2 via a shared helper.

type ReportType = "agencies" | "counselors" | "growth" | "pending";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUGG_BRANCH_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = await getSuggBranchScope(user);
  if (!scope) {
    return NextResponse.json({ error: "No Sugg Branch assigned to this manager" }, { status: 404 });
  }

  const type = (request.nextUrl.searchParams.get("type") ?? "agencies") as ReportType;

  switch (type) {
    case "agencies":
      return NextResponse.json({ type, rows: await agenciesReport(scope.suggBranchId) });
    case "counselors":
      return NextResponse.json({ type, rows: await counselorsReport(scope.suggBranchId) });
    case "growth":
      return NextResponse.json({ type, rows: await growthReport(scope.suggBranchId) });
    case "pending":
      return NextResponse.json({ type, ...(await pendingReport(scope.suggBranchId)) });
    default:
      return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  }
}

async function agenciesReport(suggBranchId: string) {
  const agencies = await prisma.agency.findMany({
    where: { suggBranchId },
    select: { id: true, name: true, approvalStatus: true },
  });
  return Promise.all(
    agencies.map(async (a) => {
      const [referrals, admissions, commission] = await Promise.all([
        prisma.lead.count({ where: { student: { agencyId: a.id } } }),
        prisma.lead.count({
          where: { student: { agencyId: a.id }, status: "ADMISSION_CONFIRMED" },
        }),
        prisma.commissionTransaction.aggregate({
          where: { agencyId: a.id },
          _sum: { commissionAmount: true },
        }),
      ]);
      return {
        agency: a.name,
        status: a.approvalStatus,
        referrals,
        admissions,
        commission: Number(commission._sum.commissionAmount ?? 0),
      };
    })
  );
}

async function counselorsReport(suggBranchId: string) {
  const counselors = await prisma.counselor.findMany({
    where: { suggBranchId },
    include: { user: { select: { id: true, fullName: true, isActive: true } } },
  });
  return Promise.all(
    counselors.map(async (c) => {
      const [assigned, admissions] = await Promise.all([
        prisma.lead.count({ where: { assignedToId: c.userId } }),
        prisma.lead.count({ where: { assignedToId: c.userId, status: "ADMISSION_CONFIRMED" } }),
      ]);
      return {
        counselor: c.user.fullName,
        active: c.user.isActive,
        assignedLeads: assigned,
        admissions,
        conversionRate: assigned > 0 ? Number(((admissions / assigned) * 100).toFixed(1)) : 0,
      };
    })
  );
}

async function growthReport(suggBranchId: string) {
  const leadWhere = await scopedLeadWhere(suggBranchId);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const leads = await prisma.lead.findMany({
    where: { AND: [leadWhere, { createdAt: { gte: sixMonthsAgo } }] } as never,
    select: { createdAt: true, status: true },
  });

  const buckets = new Map<string, { leads: number; admissions: number }>();
  for (const lead of leads) {
    const key = `${lead.createdAt.getFullYear()}-${String(lead.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.get(key) ?? { leads: 0, admissions: 0 };
    b.leads += 1;
    if (lead.status === "ADMISSION_CONFIRMED") b.admissions += 1;
    buckets.set(key, b);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, leads: v.leads, admissions: v.admissions }));
}

async function pendingReport(suggBranchId: string) {
  const [pendingRecommendations, agencyIds, leadWhere] = await Promise.all([
    prisma.agency.findMany({
      where: { suggBranchId, approvalStatus: "PENDING", recommendedAt: null },
      select: { id: true, name: true, createdAt: true },
    }),
    getScopedAgencyIds(suggBranchId),
    scopedLeadWhere(suggBranchId),
  ]);

  const unactionedLeads = await prisma.lead.count({
    where: { AND: [leadWhere, { status: "NEW" }] } as never,
  });

  return {
    pendingRecommendations,
    counts: { pendingRecommendations: pendingRecommendations.length, unactionedLeads, agencies: agencyIds.length },
  };
}
