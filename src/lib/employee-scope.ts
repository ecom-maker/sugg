import type { AuthUser } from "@/types";
import type { EmployeeType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Employee types a Branch Manager may assign: Counsellor and below. A branch
// manager can never create a peer or a senior.
export const BRANCH_MANAGER_ASSIGNABLE: EmployeeType[] = [
  "COUNSELLOR",
  "OFFICE_ASSISTANT",
  "DRIVER",
];

const ALL_TYPES: EmployeeType[] = [
  "SUPER_ADMIN",
  "BRANCH_MANAGER",
  "ASST_BRANCH_MANAGER",
  "TEAM_LEADER",
  "COUNSELLOR",
  "OFFICE_ASSISTANT",
  "DRIVER",
];

export interface EmployeeScope {
  isSuperAdmin: boolean;
  /** The branch a Branch Manager is confined to; null for Super Admin. */
  branchId: string | null;
  /** Prisma `where` clause for listing employees this user may see. */
  where: Prisma.EmployeeWhereInput;
  /** Employee types this user may assign. */
  assignableTypes: EmployeeType[];
}

/**
 * Resolve what a user may do in the employee (HR) module. Returns null if the
 * user has no access at all (or is a Branch Manager not attached to a branch).
 */
export async function getEmployeeScope(user: AuthUser): Promise<EmployeeScope | null> {
  if (user.role === "SUPER_ADMIN") {
    return { isSuperAdmin: true, branchId: null, where: {}, assignableTypes: ALL_TYPES };
  }
  if (user.role === "BRANCH_MANAGER") {
    // Resolve their branch: either the agency branch they manage, or — for a
    // branch manager provisioned from an HR employee — that employee's branch.
    const managed = await prisma.agencyBranch.findFirst({
      where: { managerId: user.id },
      select: { id: true },
    });
    let branchId = managed?.id ?? null;
    if (!branchId) {
      const emp = await prisma.employee.findFirst({
        where: { userId: user.id },
        select: { branchId: true },
      });
      branchId = emp?.branchId ?? null;
    }
    if (!branchId) return null;
    return {
      isSuperAdmin: false,
      branchId,
      where: { branchId },
      assignableTypes: BRANCH_MANAGER_ASSIGNABLE,
    };
  }
  return null;
}

/** Inputs the employee create/edit form needs, derived from the caller's scope. */
export async function getEmployeeFormContext(scope: EmployeeScope) {
  if (scope.isSuperAdmin) {
    const branches = await prisma.agencyBranch.findMany({
      select: { id: true, branchName: true, agency: { select: { name: true } } },
      orderBy: { branchName: "asc" },
    });
    return {
      canPickBranch: true,
      branchOptions: branches.map((b) => ({ value: b.id, label: `${b.branchName} — ${b.agency.name}` })),
      allowedTypes: scope.assignableTypes,
      fixedBranchLabel: null as string | null,
    };
  }
  const branch = scope.branchId
    ? await prisma.agencyBranch.findUnique({ where: { id: scope.branchId }, select: { branchName: true } })
    : null;
  return {
    canPickBranch: false,
    branchOptions: [] as { value: string; label: string }[],
    allowedTypes: scope.assignableTypes,
    fixedBranchLabel: branch?.branchName ?? "Your branch",
  };
}

/**
 * Whether this scope permits managing the given employee row. A Branch Manager
 * may only manage employees in their own branch whose type is within their
 * assignable set (never a peer or a senior).
 */
export function scopeCanManage(
  scope: EmployeeScope,
  employeeBranchId: string | null,
  employeeType?: EmployeeType
): boolean {
  if (scope.isSuperAdmin) return true;
  if (employeeBranchId === null || employeeBranchId !== scope.branchId) return false;
  if (employeeType && !scope.assignableTypes.includes(employeeType)) return false;
  return true;
}
