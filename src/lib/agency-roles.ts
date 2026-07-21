// Roles an agency owner may assign to new staff. Kept in a plain module (not the
// "use server" actions file) so client components can import these constants —
// a "use server" file may only export async functions.
//
// NOTE: BRANCH_MANAGER here is the *agency* branch manager (manages one agency
// branch). It is a different role from SUGG_BRANCH_MANAGER, which manages a
// Sugg-owned direct branch. Do not conflate the two.
export const OWNER_ASSIGNABLE_ROLES = ["AGENCY_ADMIN", "BRANCH_MANAGER", "AGENCY_COUNSELOR"] as const;
export type AgencyAssignableRole = (typeof OWNER_ASSIGNABLE_ROLES)[number];

export const AGENCY_ROLE_LABELS: Record<AgencyAssignableRole, string> = {
  AGENCY_ADMIN: "Agency Admin",
  BRANCH_MANAGER: "Manager",
  AGENCY_COUNSELOR: "Counsellor",
};

// One-line access summary shown under the role picker.
export const AGENCY_ROLE_DESCRIPTIONS: Record<AgencyAssignableRole, string> = {
  AGENCY_ADMIN: "Agency-wide access, second to the owner.",
  BRANCH_MANAGER: "Access to all details of their assigned branch.",
  AGENCY_COUNSELOR: "Access to their own leads only.",
};

// Roles that must be tied to a specific branch to be meaningful.
export const AGENCY_ROLES_REQUIRING_BRANCH: readonly AgencyAssignableRole[] = ["BRANCH_MANAGER"];
