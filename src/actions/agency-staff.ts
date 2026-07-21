"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { provisionLogin } from "@/lib/agency-auth";
import { revalidatePath } from "next/cache";

// Roles an agency owner may assign to new staff. Kept as a list so it's easy
// to widen later (e.g. add BRANCH_MANAGER / AGENCY_COUNSELOR).
export const OWNER_ASSIGNABLE_ROLES = ["AGENCY_ADMIN"] as const;
export type AgencyAssignableRole = (typeof OWNER_ASSIGNABLE_ROLES)[number];

export const AGENCY_ROLE_LABELS: Record<AgencyAssignableRole, string> = {
  AGENCY_ADMIN: "Agency Admin",
};

interface CreateAgencyStaffInput {
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  branchId?: string | null;
  /** When provided use this exact login password; blank/omitted → temp generated. */
  password?: string;
}

/**
 * Create a staff member for the acting owner's agency and provision their login.
 * Agency Owner (or Super Admin) only. Returns the temporary password once when
 * one was generated, and whether a reset email was sent.
 */
export async function createAgencyStaff(input: CreateAgencyStaffInput) {
  const actor = await requireRole(["AGENCY_OWNER", "SUPER_ADMIN"]);

  const agency = await prisma.agency.findFirst({
    where: { owner: { supabaseId: actor.supabaseId } },
    select: { id: true },
  });
  if (!agency) return { error: "No agency is linked to your account" };

  const role = input.role as AgencyAssignableRole;
  if (!OWNER_ASSIGNABLE_ROLES.includes(role)) {
    return { error: "You can't assign that role" };
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  if (fullName.length < 2) return { error: "Enter the staff member's name" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address" };
  if (input.password && input.password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  // Branch (optional) must belong to this agency.
  const branchId = input.branchId?.trim() || null;
  if (branchId) {
    const branch = await prisma.agencyBranch.findFirst({
      where: { id: branchId, agencyId: agency.id },
      select: { id: true },
    });
    if (!branch) return { error: "Select a valid branch" };
  }

  const clash = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (clash) return { error: "A user with this email already exists" };

  let staffUserId: string;
  try {
    staffUserId = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          supabaseId: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          email,
          fullName,
          phone,
          role,
          isActive: true,
        },
      });
      await tx.agencyUser.create({
        data: { userId: u.id, agencyId: agency.id, branchId, status: "ACTIVE" },
      });
      return u.id;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "That email or phone number is already in use" };
    }
    console.error("[createAgencyStaff]", err);
    return { error: "Could not create the staff member" };
  }

  // Provision a login so they can sign in (temp password when none supplied).
  const prov = await provisionLogin({
    userId: staffUserId,
    email,
    fullName,
    role,
    password: input.password || undefined,
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "CREATE_AGENCY_STAFF",
      resource: "agency",
      resourceId: agency.id,
      newValue: { email, role, branchId, loginProvisioned: !prov.error },
    },
  });

  revalidatePath("/agency/staff");

  if (prov.error) {
    return { success: true, staffId: staffUserId, email, loginError: prov.error };
  }
  return {
    success: true,
    staffId: staffUserId,
    email,
    password: prov.password,
    emailSent: Boolean(prov.emailSent),
  };
}
