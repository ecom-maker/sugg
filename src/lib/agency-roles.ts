// Roles an agency owner may assign to new staff. Kept in a plain module (not the
// "use server" actions file) so client components can import these constants —
// a "use server" file may only export async functions. Widen this list later to
// allow more roles (e.g. BRANCH_MANAGER / AGENCY_COUNSELOR).
export const OWNER_ASSIGNABLE_ROLES = ["AGENCY_ADMIN"] as const;
export type AgencyAssignableRole = (typeof OWNER_ASSIGNABLE_ROLES)[number];

export const AGENCY_ROLE_LABELS: Record<AgencyAssignableRole, string> = {
  AGENCY_ADMIN: "Agency Admin",
};
