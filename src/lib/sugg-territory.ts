import { prisma } from "@/lib/prisma";

// ─── Sugg Branch territory resolution & overlap validation ───────────────────
//
// A Sugg Branch's coverage is defined by rows in sugg_branch_territories. A
// territory can be scoped to a whole country (state_id & district_id null), a
// whole state (district_id null), or a single district.
//
// Resolution rule (spec §1): MOST-SPECIFIC MATCH WINS —
//   district territory → state territory → country territory.
//
// Overlap rule (spec §1): a given district / state / country maps to at most
// one ACTIVE Sugg Branch. Because resolution is most-specific-wins, the only
// way resolution becomes ambiguous is when two branches claim the SAME area at
// the SAME specificity level. That — and only that — is a conflict. Nested
// claims at different levels (e.g. Branch A covers a state, Branch B covers one
// district inside it) are allowed and resolve deterministically.

export interface GeoInput {
  countryId?: string | null;
  stateId?: string | null;
  districtId?: string | null;
}

export interface ResolvedSuggBranch {
  id: string;
  branchName: string;
  branchCode: string;
  email: string | null;
  phone: string | null;
  managerId: string | null;
}

const ACTIVE = "ACTIVE" as const;

const branchSelect = {
  id: true,
  branchName: true,
  branchCode: true,
  email: true,
  phone: true,
  managerId: true,
} as const;

/**
 * Fill in parent geography (state, country) from a districtId or stateId so the
 * resolver can walk district → state → country regardless of how much the
 * caller supplied.
 */
async function normalizeGeo(geo: GeoInput): Promise<GeoInput> {
  let { countryId, stateId } = geo;
  const { districtId } = geo;

  if (districtId && (!stateId || !countryId)) {
    const district = await prisma.district.findUnique({
      where: { id: districtId },
      select: { stateId: true, state: { select: { countryId: true } } },
    });
    if (district) {
      stateId = stateId ?? district.stateId;
      countryId = countryId ?? district.state.countryId;
    }
  }

  if (stateId && !countryId) {
    const state = await prisma.state.findUnique({
      where: { id: stateId },
      select: { countryId: true },
    });
    if (state) countryId = state.countryId;
  }

  return { countryId: countryId ?? null, stateId: stateId ?? null, districtId: districtId ?? null };
}

/**
 * Resolve the single ACTIVE Sugg Branch that covers the supplied geography.
 * Returns null when no branch covers the location (unassigned territory).
 */
export async function resolveSuggBranch(geo: GeoInput): Promise<ResolvedSuggBranch | null> {
  const { countryId, stateId, districtId } = await normalizeGeo(geo);

  // 1. District-level match (most specific)
  if (districtId) {
    const territory = await prisma.suggBranchTerritory.findFirst({
      where: { districtId, suggBranch: { status: ACTIVE } },
      select: { suggBranch: { select: branchSelect } },
    });
    if (territory?.suggBranch) return territory.suggBranch;
  }

  // 2. State-level match (district_id null = whole state)
  if (stateId) {
    const territory = await prisma.suggBranchTerritory.findFirst({
      where: { stateId, districtId: null, suggBranch: { status: ACTIVE } },
      select: { suggBranch: { select: branchSelect } },
    });
    if (territory?.suggBranch) return territory.suggBranch;
  }

  // 3. Country-level match (state_id & district_id null = whole country)
  if (countryId) {
    const territory = await prisma.suggBranchTerritory.findFirst({
      where: { countryId, stateId: null, districtId: null, suggBranch: { status: ACTIVE } },
      select: { suggBranch: { select: branchSelect } },
    });
    if (territory?.suggBranch) return territory.suggBranch;
  }

  return null;
}

export interface TerritoryOverlapCheck {
  suggBranchId: string;
  countryId: string;
  stateId?: string | null;
  districtId?: string | null;
}

export interface OverlapResult {
  ok: boolean;
  conflict?: { id: string; branchName: string; level: "district" | "state" | "country" };
}

/**
 * Reject a new/edited territory that collides with another ACTIVE Sugg Branch
 * at the same specificity level for the same area. On conflict, names the
 * offending branch so the caller can surface a clear error.
 */
export async function validateTerritoryNoOverlap(
  input: TerritoryOverlapCheck
): Promise<OverlapResult> {
  const { suggBranchId, countryId, stateId, districtId } = input;

  // Determine the specificity level of the incoming territory.
  const level: "district" | "state" | "country" = districtId
    ? "district"
    : stateId
      ? "state"
      : "country";

  const sameLevelWhere =
    level === "district"
      ? { districtId }
      : level === "state"
        ? { stateId, districtId: null }
        : { countryId, stateId: null, districtId: null };

  const conflict = await prisma.suggBranchTerritory.findFirst({
    where: {
      ...sameLevelWhere,
      suggBranchId: { not: suggBranchId },
      suggBranch: { status: ACTIVE },
    },
    select: { suggBranch: { select: { id: true, branchName: true } } },
  });

  if (conflict?.suggBranch) {
    return {
      ok: false,
      conflict: { id: conflict.suggBranch.id, branchName: conflict.suggBranch.branchName, level },
    };
  }

  return { ok: true };
}

export interface AutoAssignResult {
  assigned: number;
  unmatched: number;
  details: Array<{ agencyId: string; agencyName: string; suggBranchId: string | null }>;
}

/**
 * One-time best-effort mapping of existing agencies to their covering Sugg
 * Branch by geography (migration note §13). Only touches agencies that are
 * currently unassigned. Writes an audit log for each change and flags any
 * agency with no covering branch as unmatched.
 */
export async function autoAssignExistingAgencies(actorId?: string): Promise<AutoAssignResult> {
  const agencies = await prisma.agency.findMany({
    where: { suggBranchId: null },
    select: { id: true, name: true, countryId: true, stateId: true, districtId: true },
  });

  let assigned = 0;
  let unmatched = 0;
  const details: AutoAssignResult["details"] = [];

  for (const agency of agencies) {
    const branch = await resolveSuggBranch({
      countryId: agency.countryId,
      stateId: agency.stateId,
      districtId: agency.districtId,
    });

    if (branch) {
      await prisma.$transaction([
        prisma.agency.update({
          where: { id: agency.id },
          data: { suggBranchId: branch.id },
        }),
        prisma.auditLog.create({
          data: {
            userId: actorId ?? null,
            action: "AUTO_ASSIGN_AGENCY_SUGG_BRANCH",
            resource: "agency",
            resourceId: agency.id,
            newValue: { suggBranchId: branch.id, suggBranchName: branch.branchName },
          },
        }),
      ]);
      assigned += 1;
      details.push({ agencyId: agency.id, agencyName: agency.name, suggBranchId: branch.id });
    } else {
      unmatched += 1;
      details.push({ agencyId: agency.id, agencyName: agency.name, suggBranchId: null });
    }
  }

  return { assigned, unmatched, details };
}
