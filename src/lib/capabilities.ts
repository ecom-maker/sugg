import type { EmployeeType, UserRole } from "@prisma/client";

// ─── Capability catalog ──────────────────────────────────────────────────────
//
// Capabilities are ADDITIVE grants layered on top of a user's role. A user's
// effective access = role defaults (canAccess) ∪ the grants of their granted
// capabilities. Each capability's scope is baked into its definition here, so
// an admin toggling a named capability can never widen access past the scope we
// intend (e.g. "View course commission offered" can't reach a college's private
// ledger — the boundary lives in the grant list below, not in the checkbox).

export type Capability = "VIEW_COMMISSIONS";

export interface CapabilityDef {
  key: Capability;
  label: string;
  description: string;
  /** Resource/action pairs this capability unlocks in canAccess. */
  grants: { resource: string; action: string }[];
}

export const CAPABILITY_CATALOG: CapabilityDef[] = [
  {
    key: "VIEW_COMMISSIONS",
    label: "View Commissions",
    description:
      "Read-only access to commission records, scoped to the employee's role boundary. No approve/pay actions.",
    grants: [{ resource: "commissions", action: "read" }],
  },
];

const CATALOG_BY_KEY: Record<string, CapabilityDef> = Object.fromEntries(
  CAPABILITY_CATALOG.map((c) => [c.key, c])
);

/** Valid capability keys (for validation of incoming toggle payloads). */
export const CAPABILITY_KEYS = CAPABILITY_CATALOG.map((c) => c.key);

/** True if any of the user's capabilities grants (resource, action). */
export function capabilitiesAllow(
  capabilities: string[] | undefined,
  resource: string,
  action: string
): boolean {
  if (!capabilities?.length) return false;
  return capabilities.some((key) =>
    CATALOG_BY_KEY[key]?.grants.some(
      (g) =>
        (g.resource === resource || g.resource === "*") &&
        (g.action === action || g.action === "*")
    )
  );
}

// ─── Login provisioning: employee job title → base auth role ─────────────────
//
// Employee types are job titles, not the 7 auth roles. When an employee is
// given a login, they get the nearest Sugg-internal base role; capabilities add
// anything beyond it. These map only to internal roles (never a tenant role),
// so provisioning never crosses a tenant boundary.

export const EMPLOYEE_ROLE_MAP: Record<EmployeeType, UserRole> = {
  SUPER_ADMIN: "SUPER_ADMIN",
  BRANCH_MANAGER: "SUGG_BRANCH_MANAGER",
  ASST_BRANCH_MANAGER: "SUGG_BRANCH_MANAGER",
  TEAM_LEADER: "SUGG_COUNSELOR",
  COUNSELLOR: "SUGG_COUNSELOR",
  OFFICE_ASSISTANT: "SUGG_COUNSELOR",
  DRIVER: "SUGG_COUNSELOR",
};
