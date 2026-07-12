import { prisma } from "@/lib/prisma";
import { getHierarchyScope } from "@/lib/hierarchy-scope";
import type { AuthUser } from "@/types";

// ─── Agency access gating + lead scoping (application-layer) ──────────────────

const AGENCY_ROLES = ["AGENCY_OWNER", "AGENCY_ADMIN", "BRANCH_MANAGER", "AGENCY_COUNSELOR"];

export interface AgencyApprovalState {
  agencyId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "ARCHIVED";
  reason: string | null;
}

/**
 * Resolve the agency approval state for an agency-role user. Returns null for
 * non-agency roles (Super Admin, college, Sugg-internal) — they are never gated
 * by this.
 */
export async function getAgencyApprovalState(user: AuthUser): Promise<AgencyApprovalState | null> {
  if (!AGENCY_ROLES.includes(user.role)) return null;
  const scope = await getHierarchyScope(user);
  if (!scope.agencyId) return null;
  const agency = await prisma.agency.findUnique({
    where: { id: scope.agencyId },
    select: { id: true, approvalStatus: true, rejectionReason: true },
  });
  if (!agency) return null;
  return { agencyId: agency.id, status: agency.approvalStatus, reason: agency.rejectionReason };
}

/** An agency-role user may only operate when their agency is APPROVED. */
export function isAgencyBlocked(state: AgencyApprovalState | null): boolean {
  return state !== null && state.status !== "APPROVED";
}

/**
 * Prisma `where` fragment for the agency leads list, scoped by role:
 * owner/admin → whole agency, branch manager → own branch, counselor → own.
 */
export async function getAgencyLeadWhere(user: AuthUser) {
  const scope = await getHierarchyScope(user);
  if (!scope.agencyId) return { id: "__none__" };
  if (user.role === "AGENCY_OWNER" || user.role === "AGENCY_ADMIN") {
    return { student: { agencyId: scope.agencyId } };
  }
  if (user.role === "BRANCH_MANAGER") {
    return { branchId: scope.branchId ?? "__none__" };
  }
  // Agency counselor: own leads only.
  return { assignedToId: user.id, student: { agencyId: scope.agencyId } };
}
