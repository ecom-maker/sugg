import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { AuthUser, UserRole } from "@/types";

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: {
      id: true,
      supabaseId: true,
      email: true,
      phone: true,
      fullName: true,
      avatarUrl: true,
      role: true,
      isActive: true,
    },
  });

  if (!dbUser || !dbUser.isActive) return null;

  return dbUser as AuthUser;
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(
  allowedRoles: UserRole[]
): Promise<AuthUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    redirect("/unauthorized");
  }
  return user;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export function getRoleRedirectPath(role: UserRole): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/admin";
    case "SUGG_COUNSELOR":
      return "/counselor";
    case "SUGG_BRANCH_MANAGER":
      return "/sugg-branch";
    case "COLLEGE_ADMIN":
      return "/college";
    case "AGENCY_OWNER":
      return "/agency/owner";
    case "AGENCY_ADMIN":
      return "/agency/admin";
    case "BRANCH_MANAGER":
      return "/branch";
    case "AGENCY_COUNSELOR":
      return "/counselor";
    default:
      return "/login";
  }
}

export function canAccess(userRole: UserRole, resource: string, action: string): boolean {
  const permissions: Record<UserRole, Record<string, string[]>> = {
    SUPER_ADMIN: {
      "*": ["*"],
    },
    SUGG_COUNSELOR: {
      leads: ["read", "update"],
      students: ["read", "create", "update"],
      student_profile: ["read", "update"],
      lead_notes: ["create", "read"],
      lead_followups: ["create", "read", "update"],
      applications: ["create", "read", "update"],
      whatsapp: ["read", "send"],
      calls: ["create", "read"],
      tasks: ["create", "read", "update"],
    },
    // Sugg Branch Manager — manages agencies & Sugg counselors within own
    // territory. Read-only on agency-owned data; recommend (not approve) on
    // agency onboarding; write only on Sugg-internal counselors and leads.
    SUGG_BRANCH_MANAGER: {
      sugg_branch: ["read"],
      agencies: ["read"],
      agency_recommendations: ["create"],
      sugg_counselors: ["create", "read", "update"],
      leads: ["read", "assign"],
      students: ["read"],
      commissions: ["read"],
      reports: ["read"],
      hierarchy: ["read"],
      notifications: ["read"],
    },
    COLLEGE_ADMIN: {
      college: ["read", "update"],
      courses: ["create", "read", "update", "delete"],
      applications: ["read", "update"],
      commissions: ["read"],
      universities: ["read"],
    },
    AGENCY_OWNER: {
      agency: ["read", "update"],
      branches: ["create", "read", "update", "delete"],
      agency_users: ["create", "read", "update", "delete"],
      referrals: ["create", "read", "update"],
      commissions: ["read"],
      reports: ["read"],
      hierarchy: ["read"],
      teams: ["create", "read", "update", "delete"],
      students: ["read", "update"],
      student_profile: ["read", "update"],
    },
    AGENCY_ADMIN: {
      agency: ["read"],
      branches: ["create", "read", "update"],
      agency_users: ["create", "read", "update"],
      referrals: ["create", "read", "update"],
      commissions: ["read"],
      reports: ["read"],
      hierarchy: ["read"],
      teams: ["create", "read", "update"],
      students: ["read", "update"],
      student_profile: ["read", "update"],
    },
    BRANCH_MANAGER: {
      branch: ["read", "update"],
      agency_users: ["create", "read", "update"],
      students: ["read", "create", "update"],
      student_profile: ["read", "update"],
      leads: ["read", "update"],
      commissions: ["read"],
      reports: ["read"],
      tasks: ["create", "read", "update"],
      hierarchy: ["read"],
      teams: ["create", "read", "update"],
    },
    AGENCY_COUNSELOR: {
      referrals: ["create", "read"],
      students: ["create", "read", "update"],
      student_profile: ["read", "update"],
      leads: ["read"],
      commissions: ["read"],
    },
  };

  const rolePermissions = permissions[userRole];
  if (!rolePermissions) return false;

  // Super admin has all access
  if (rolePermissions["*"]?.[0] === "*") return true;

  const resourcePerms = rolePermissions[resource] || [];
  return resourcePerms.includes(action) || resourcePerms.includes("*");
}
