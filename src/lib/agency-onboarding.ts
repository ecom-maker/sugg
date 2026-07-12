import type { Prisma } from "@prisma/client";

// ─── Agency onboarding automation ────────────────────────────────────────────
// Shared helpers used by admin approval and admin-create so both paths activate
// the agency identically.

export interface AgencyGeo {
  id: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  countryId: string | null;
  stateId: string | null;
  districtId: string | null;
  phone: string | null;
  email: string | null;
}

/**
 * Create the default "Head Office" branch for a newly-approved agency so
 * counselors/teams can be added immediately. No-op if the agency already has a
 * branch. branch_code is globally unique, so falls back to HO-N.
 */
export async function ensureHeadOfficeBranch(tx: Prisma.TransactionClient, agency: AgencyGeo) {
  const existing = await tx.agencyBranch.count({ where: { agencyId: agency.id } });
  if (existing > 0) return null;

  let code = "HO";
  let n = 1;
  while (await tx.agencyBranch.findUnique({ where: { branchCode: code }, select: { id: true } })) {
    code = `HO-${n++}`;
  }

  return tx.agencyBranch.create({
    data: {
      agencyId: agency.id,
      branchName: "Head Office",
      branchCode: code,
      address: agency.address,
      city: agency.city,
      state: agency.state,
      country: agency.country,
      countryId: agency.countryId,
      stateId: agency.stateId,
      districtId: agency.districtId,
      phone: agency.phone,
      email: agency.email,
      status: "ACTIVE",
    },
  });
}

/**
 * Activate the agency's newly-registered staff (owner + optional manager).
 * Only touches AgencyUser rows still in PENDING so previously-disabled
 * counselors are never re-enabled.
 */
export async function activatePendingAgencyUsers(tx: Prisma.TransactionClient, agencyId: string) {
  const links = await tx.agencyUser.findMany({
    where: { agencyId, status: "PENDING" },
    select: { userId: true },
  });
  const userIds = links.map((l) => l.userId);
  if (!userIds.length) return;
  await tx.user.updateMany({ where: { id: { in: userIds } }, data: { isActive: true } });
  await tx.agencyUser.updateMany({
    where: { agencyId, status: "PENDING" },
    data: { status: "ACTIVE" },
  });
}
