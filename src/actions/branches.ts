"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

interface CreateBranchData {
  branchName: string;
  branchCode: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export async function createBranch(data: CreateBranchData) {
  const user = await getAuthUser();
  if (!user || !["AGENCY_OWNER", "AGENCY_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return { error: "Unauthorized" };
  }

  const agency = await prisma.agency.findFirst({
    where: {
      OR: [
        { owner: { supabaseId: user.supabaseId } },
        { agencyUsers: { some: { user: { supabaseId: user.supabaseId } } } },
      ],
    },
  });

  if (!agency) return { error: "No agency found for your account" };

  const existing = await prisma.agencyBranch.findUnique({
    where: { branchCode: data.branchCode.toUpperCase() },
  });
  if (existing) return { error: "Branch code already exists" };

  const branch = await prisma.agencyBranch.create({
    data: {
      agencyId: agency.id,
      branchName: data.branchName,
      branchCode: data.branchCode.toUpperCase(),
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      postalCode: data.postalCode || null,
      phone: data.phone || null,
      email: data.email || null,
    },
  });

  revalidatePath("/agency/branches");
  return { branch };
}

interface UpdateBranchData extends Partial<CreateBranchData> {
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  managerId?: string | null;
}

export async function updateBranch(branchId: string, data: UpdateBranchData) {
  const user = await getAuthUser();
  if (!user || !["AGENCY_OWNER", "AGENCY_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return { error: "Unauthorized" };
  }

  const branch = await prisma.agencyBranch.update({
    where: { id: branchId },
    data: {
      ...(data.branchName && { branchName: data.branchName }),
      ...(data.city !== undefined && { city: data.city || null }),
      ...(data.state !== undefined && { state: data.state || null }),
      ...(data.country !== undefined && { country: data.country || null }),
      ...(data.postalCode !== undefined && { postalCode: data.postalCode || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.address !== undefined && { address: data.address || null }),
      ...(data.status && { status: data.status }),
      ...(data.managerId !== undefined && { managerId: data.managerId }),
    },
  });

  revalidatePath("/agency/branches");
  revalidatePath(`/agency/branches/${branchId}`);
  return { branch };
}

export async function assignManagerToBranch(branchId: string, managerId: string) {
  const user = await getAuthUser();
  if (!user || !["AGENCY_OWNER", "AGENCY_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return { error: "Unauthorized" };
  }

  // Update the user's role to BRANCH_MANAGER
  await prisma.user.update({
    where: { id: managerId },
    data: { role: "BRANCH_MANAGER" },
  });

  const branch = await prisma.agencyBranch.update({
    where: { id: branchId },
    data: { managerId },
  });

  revalidatePath(`/agency/branches/${branchId}`);
  return { branch };
}

export async function transferCounselorToBranch(counselorUserId: string, newBranchId: string) {
  const user = await getAuthUser();
  if (!user || !["AGENCY_OWNER", "AGENCY_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN"].includes(user.role)) {
    return { error: "Unauthorized" };
  }

  const agencyUser = await prisma.agencyUser.findUnique({
    where: { userId: counselorUserId },
  });

  if (!agencyUser) return { error: "Counselor not found" };

  await prisma.agencyUser.update({
    where: { userId: counselorUserId },
    data: { branchId: newBranchId },
  });

  revalidatePath("/agency/branches");
  revalidatePath(`/agency/branches/${newBranchId}`);
  return { success: true };
}

export async function setBranchTarget(
  branchId: string,
  month: number,
  year: number,
  targets: { leadTarget: number; admissionTarget: number; revenueTarget: number }
) {
  const user = await getAuthUser();
  if (!user || !["AGENCY_OWNER", "AGENCY_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return { error: "Unauthorized" };
  }

  const target = await prisma.branchTarget.upsert({
    where: { branchId_month_year: { branchId, month, year } },
    create: { branchId, month, year, ...targets },
    update: targets,
  });

  return { target };
}

export async function assignLeadToBranch(leadId: string, branchId: string, counselorId?: string) {
  const user = await getAuthUser();
  if (!user) return { error: "Unauthorized" };

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      branchId,
      ...(counselorId && { assignedToId: counselorId }),
    },
  });

  revalidatePath("/branch/leads");
  return { success: true };
}
