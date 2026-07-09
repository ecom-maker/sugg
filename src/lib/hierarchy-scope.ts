import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/types";

export interface HierarchyScope {
  role: AuthUser["role"];
  agencyId: string | null;
  branchId: string | null;
  agencyUserId: string | null;
  userId: string;
}

export async function getHierarchyScope(user: AuthUser): Promise<HierarchyScope> {
  const agencyUser = await prisma.agencyUser.findUnique({
    where: { userId: user.id },
    select: { id: true, agencyId: true, branchId: true },
  });

  let branchId = agencyUser?.branchId ?? null;

  if (user.role === "BRANCH_MANAGER") {
    const managed = await prisma.agencyBranch.findFirst({
      where: { managerId: user.id },
      select: { id: true, agencyId: true },
    });
    if (managed) {
      branchId = managed.id;
      return {
        role: user.role,
        agencyId: managed.agencyId,
        branchId: managed.id,
        agencyUserId: agencyUser?.id ?? null,
        userId: user.id,
      };
    }
  }

  if (user.role === "AGENCY_OWNER") {
    const agency = await prisma.agency.findFirst({
      where: { owner: { supabaseId: user.supabaseId } },
      select: { id: true },
    });
    return {
      role: user.role,
      agencyId: agency?.id ?? agencyUser?.agencyId ?? null,
      branchId: null,
      agencyUserId: agencyUser?.id ?? null,
      userId: user.id,
    };
  }

  return {
    role: user.role,
    agencyId: agencyUser?.agencyId ?? null,
    branchId,
    agencyUserId: agencyUser?.id ?? null,
    userId: user.id,
  };
}

export function canAccessHierarchy(role: AuthUser["role"]): boolean {
  return ["SUPER_ADMIN", "AGENCY_OWNER", "AGENCY_ADMIN", "BRANCH_MANAGER"].includes(role);
}

export function canManageTeams(role: AuthUser["role"]): boolean {
  return ["SUPER_ADMIN", "AGENCY_OWNER", "AGENCY_ADMIN", "BRANCH_MANAGER"].includes(role);
}

export function canManageGeoReference(role: AuthUser["role"]): boolean {
  return role === "SUPER_ADMIN";
}
