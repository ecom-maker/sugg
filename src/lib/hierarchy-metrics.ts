import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface HierarchyMetrics {
  totalLeads: number;
  activeStudents: number;
  admissionsConfirmed: number;
  conversionRate: number;
  commissionGenerated: number;
  commissionPaid: number;
  pendingFollowups: number;
}

export const EMPTY_METRICS: HierarchyMetrics = {
  totalLeads: 0,
  activeStudents: 0,
  admissionsConfirmed: 0,
  conversionRate: 0,
  commissionGenerated: 0,
  commissionPaid: 0,
  pendingFollowups: 0,
};

function calcConversionRate(total: number, confirmed: number): number {
  return total > 0 ? Number(((confirmed / total) * 100).toFixed(1)) : 0;
}

async function aggregateLeadMetrics(where: Prisma.LeadWhereInput): Promise<Pick<HierarchyMetrics, "totalLeads" | "admissionsConfirmed" | "activeStudents">> {
  const [totalLeads, admissionsConfirmed, activeStudentGroups] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, status: "ADMISSION_CONFIRMED" } }),
    prisma.lead.groupBy({
      by: ["studentId"],
      where: { ...where, status: { not: "LOST" } },
    }),
  ]);
  return {
    totalLeads,
    admissionsConfirmed,
    activeStudents: activeStudentGroups.length,
  };
}

async function aggregateFollowups(where: Prisma.LeadFollowupWhereInput): Promise<number> {
  return prisma.leadFollowup.count({
    where: { ...where, status: "PENDING" },
  });
}

async function aggregateCommissions(where: Prisma.CommissionTransactionWhereInput): Promise<Pick<HierarchyMetrics, "commissionGenerated" | "commissionPaid">> {
  const [generated, paid] = await Promise.all([
    prisma.commissionTransaction.aggregate({
      _sum: { commissionAmount: true },
      where,
    }),
    prisma.commissionTransaction.aggregate({
      _sum: { commissionAmount: true },
      where: { ...where, status: "PAID" },
    }),
  ]);
  return {
    commissionGenerated: Number(generated._sum.commissionAmount ?? 0),
    commissionPaid: Number(paid._sum.commissionAmount ?? 0),
  };
}

export async function getCounselorMetrics(userId: string): Promise<HierarchyMetrics> {
  const agencyUser = await prisma.agencyUser.findUnique({ where: { userId } });
  const leadWhere: Prisma.LeadWhereInput = { assignedToId: userId };

  const [leads, followups, commissions] = await Promise.all([
    aggregateLeadMetrics(leadWhere),
    aggregateFollowups({ userId }),
    aggregateCommissions(
      agencyUser
        ? { counselorId: agencyUser.id }
        : { application: { student: { leads: { some: { isCurrent: true, assignedToId: userId } } } } }
    ),
  ]);

  return {
    ...leads,
    conversionRate: calcConversionRate(leads.totalLeads, leads.admissionsConfirmed),
    pendingFollowups: followups,
    ...commissions,
  };
}

export async function getTeamMetrics(teamId: string): Promise<HierarchyMetrics> {
  const members = await prisma.teamMember.findMany({
    where: { teamId, status: "ACTIVE" },
    include: { counselor: { select: { userId: true, id: true } } },
  });
  if (members.length === 0) return EMPTY_METRICS;

  const userIds = members.map((m) => m.counselor.userId);
  const counselorIds = members.map((m) => m.counselor.id);
  const leadWhere: Prisma.LeadWhereInput = { assignedToId: { in: userIds } };

  const [leads, followups, commissions] = await Promise.all([
    aggregateLeadMetrics(leadWhere),
    aggregateFollowups({ userId: { in: userIds } }),
    aggregateCommissions({ counselorId: { in: counselorIds } }),
  ]);

  return {
    ...leads,
    conversionRate: calcConversionRate(leads.totalLeads, leads.admissionsConfirmed),
    pendingFollowups: followups,
    ...commissions,
  };
}

export async function getBranchMetrics(branchId: string): Promise<HierarchyMetrics> {
  const leadWhere: Prisma.LeadWhereInput = { branchId };
  const [leads, followups, commissions, activeStudents] = await Promise.all([
    aggregateLeadMetrics(leadWhere),
    aggregateFollowups({ lead: { branchId } }),
    aggregateCommissions({ branchId }),
    prisma.student.count({ where: { branchId, isActive: true } }),
  ]);

  return {
    ...leads,
    activeStudents: activeStudents || leads.activeStudents,
    conversionRate: calcConversionRate(leads.totalLeads, leads.admissionsConfirmed),
    pendingFollowups: followups,
    ...commissions,
  };
}

export async function getDistrictMetrics(districtId: string, agencyId?: string | null): Promise<HierarchyMetrics> {
  const branchWhere: Prisma.AgencyBranchWhereInput = {
    districtId,
    ...(agencyId ? { agencyId } : {}),
  };
  const branches = await prisma.agencyBranch.findMany({ where: branchWhere, select: { id: true } });
  if (branches.length === 0) return EMPTY_METRICS;

  const branchIds = branches.map((b) => b.id);
  const leadWhere: Prisma.LeadWhereInput = { branchId: { in: branchIds } };

  const [leads, followups, commissions, activeStudents] = await Promise.all([
    aggregateLeadMetrics(leadWhere),
    aggregateFollowups({ lead: { branchId: { in: branchIds } } }),
    aggregateCommissions({ branchId: { in: branchIds } }),
    prisma.student.count({ where: { branchId: { in: branchIds }, isActive: true } }),
  ]);

  return {
    ...leads,
    activeStudents: activeStudents || leads.activeStudents,
    conversionRate: calcConversionRate(leads.totalLeads, leads.admissionsConfirmed),
    pendingFollowups: followups,
    ...commissions,
  };
}

export async function getStateMetrics(stateId: string, agencyId?: string | null): Promise<HierarchyMetrics> {
  const districts = await prisma.district.findMany({ where: { stateId }, select: { id: true } });
  if (districts.length === 0) return EMPTY_METRICS;

  const results = await Promise.all(
    districts.map((d) => getDistrictMetrics(d.id, agencyId))
  );
  return rollupMetrics(results);
}

export async function getCountryMetrics(countryId: string, agencyId?: string | null): Promise<HierarchyMetrics> {
  const states = await prisma.state.findMany({ where: { countryId }, select: { id: true } });
  if (states.length === 0) return EMPTY_METRICS;

  const results = await Promise.all(
    states.map((s) => getStateMetrics(s.id, agencyId))
  );
  return rollupMetrics(results);
}

export function rollupMetrics(items: HierarchyMetrics[]): HierarchyMetrics {
  const totalLeads = items.reduce((s, i) => s + i.totalLeads, 0);
  const admissionsConfirmed = items.reduce((s, i) => s + i.admissionsConfirmed, 0);
  return {
    totalLeads,
    activeStudents: items.reduce((s, i) => s + i.activeStudents, 0),
    admissionsConfirmed,
    conversionRate: calcConversionRate(totalLeads, admissionsConfirmed),
    commissionGenerated: items.reduce((s, i) => s + i.commissionGenerated, 0),
    commissionPaid: items.reduce((s, i) => s + i.commissionPaid, 0),
    pendingFollowups: items.reduce((s, i) => s + i.pendingFollowups, 0),
  };
}

export async function getNodeMetrics(
  type: string,
  id: string,
  agencyId?: string | null
): Promise<HierarchyMetrics> {
  switch (type) {
    case "country":
      return getCountryMetrics(id, agencyId);
    case "state":
      return getStateMetrics(id, agencyId);
    case "district":
      return getDistrictMetrics(id, agencyId);
    case "branch":
      return getBranchMetrics(id);
    case "team":
      return getTeamMetrics(id);
    case "counselor":
      return getCounselorMetrics(id);
    default:
      return EMPTY_METRICS;
  }
}
