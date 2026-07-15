import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/types";

/** The Sugg Branch a manager operates (a branch they manage, or their own employee record). */
export async function managerBranchId(userId: string): Promise<string | null> {
  const managed = await prisma.suggBranch.findFirst({ where: { managerId: userId }, select: { id: true } });
  if (managed) return managed.id;
  const emp = await prisma.employee.findFirst({
    where: { userId, branchId: { not: null } },
    select: { branchId: true },
  });
  return emp?.branchId ?? null;
}

export interface LeadAccess {
  canView: boolean;
  canEdit: boolean;
}

/**
 * Who can view/edit a lead:
 * - Super Admin: any lead.
 * - Counsellor: only the lead assigned to them.
 * - Branch Manager: leads of the counsellors in their branch (assignee is an
 *   employee in their branch), or leads the branch added directly.
 */
export async function resolveLeadAccess(
  user: AuthUser,
  lead: { assignedToId: string | null; suggBranchId: string | null }
): Promise<LeadAccess> {
  if (user.role === "SUPER_ADMIN") return { canView: true, canEdit: true };

  if (user.role === "SUGG_COUNSELOR" || user.role === "AGENCY_COUNSELOR") {
    const own = lead.assignedToId === user.id;
    return { canView: own, canEdit: own };
  }

  if (user.role === "SUGG_BRANCH_MANAGER" || user.role === "BRANCH_MANAGER") {
    const branchId = await managerBranchId(user.id);
    if (!branchId) return { canView: false, canEdit: false };
    if (lead.suggBranchId && lead.suggBranchId === branchId) return { canView: true, canEdit: true };
    if (lead.assignedToId) {
      const emp = await prisma.employee.findFirst({
        where: { userId: lead.assignedToId, branchId },
        select: { id: true },
      });
      if (emp) return { canView: true, canEdit: true };
    }
    return { canView: false, canEdit: false };
  }

  return { canView: false, canEdit: false };
}
