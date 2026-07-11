import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/types";

// ─── Sugg Branch Manager access scoping (application-layer RLS) ───────────────
//
// The platform enforces row isolation in query code (not Postgres RLS). A Sugg
// Branch Manager may READ agencies/leads/students/commissions belonging to
// agencies their Sugg Branch covers, and may WRITE only Sugg-internal counselor
// and lead records within their own branch (spec §8). These helpers resolve the
// manager's branch and the id sets used to build scoped Prisma `where` clauses.

export interface SuggBranchScope {
  suggBranchId: string;
  branchName: string;
}

/**
 * Resolve the Sugg Branch a manager operates (via sugg_branches.manager_id).
 * Returns null when the user is not a Sugg Branch Manager or has no branch.
 */
export async function getSuggBranchScope(user: AuthUser): Promise<SuggBranchScope | null> {
  if (user.role !== "SUGG_BRANCH_MANAGER") return null;
  const branch = await prisma.suggBranch.findFirst({
    where: { managerId: user.id },
    select: { id: true, branchName: true },
  });
  return branch ? { suggBranchId: branch.id, branchName: branch.branchName } : null;
}

/** Agency ids covered by this Sugg Branch (agency.sugg_branch_id = branch). */
export async function getScopedAgencyIds(suggBranchId: string): Promise<string[]> {
  const agencies = await prisma.agency.findMany({
    where: { suggBranchId },
    select: { id: true },
  });
  return agencies.map((a) => a.id);
}

/** User ids of Sugg-internal counselors assigned to this Sugg Branch. */
export async function getScopedSuggCounselorUserIds(suggBranchId: string): Promise<string[]> {
  const counselors = await prisma.counselor.findMany({
    where: { suggBranchId },
    select: { userId: true },
  });
  return counselors.map((c) => c.userId);
}

/** True when the agency is covered by this Sugg Branch. */
export async function isAgencyInScope(suggBranchId: string, agencyId: string): Promise<boolean> {
  const agency = await prisma.agency.findFirst({
    where: { id: agencyId, suggBranchId },
    select: { id: true },
  });
  return agency !== null;
}

/** True when the Sugg-internal counselor belongs to this Sugg Branch. */
export async function isCounselorInScope(
  suggBranchId: string,
  counselorId: string
): Promise<boolean> {
  const counselor = await prisma.counselor.findFirst({
    where: { id: counselorId, suggBranchId },
    select: { id: true },
  });
  return counselor !== null;
}

/**
 * Prisma `where` fragment for "leads in this territory": either the lead's
 * student belongs to a covered agency, or the lead is assigned to a Sugg
 * counselor of this branch (territory-aware Sugg-internal routing).
 */
export async function scopedLeadWhere(suggBranchId: string) {
  const [agencyIds, counselorUserIds] = await Promise.all([
    getScopedAgencyIds(suggBranchId),
    getScopedSuggCounselorUserIds(suggBranchId),
  ]);
  return {
    OR: [
      { student: { agencyId: { in: agencyIds } } },
      { assignedToId: { in: counselorUserIds } },
    ],
  };
}
