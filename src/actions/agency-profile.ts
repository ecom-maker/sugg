"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

interface AgencyProfileData {
  name?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Let an agency owner (or Super Admin) edit their agency's basic profile.
 * The login email is intentionally not editable here — it's the agency's
 * unique identity / login. Scoped: an owner may only edit their own agency.
 */
export async function updateAgencyProfile(agencyId: string, data: AgencyProfileData) {
  const user = await getAuthUser();
  if (!user || !["AGENCY_OWNER", "SUPER_ADMIN"].includes(user.role)) {
    return { error: "Unauthorized" };
  }

  const agency = await prisma.agency.findFirst({
    where:
      user.role === "SUPER_ADMIN"
        ? { id: agencyId }
        : { id: agencyId, owner: { supabaseId: user.supabaseId } },
    select: { id: true },
  });
  if (!agency) return { error: "Access denied" };

  const name = data.name?.trim();
  if (name !== undefined && name.length < 2) {
    return { error: "Agency name must be at least 2 characters" };
  }

  try {
    await prisma.agency.update({
      where: { id: agencyId },
      data: {
        ...(name ? { name } : {}),
        phone: data.phone?.trim() || null,
        website: data.website?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        country: data.country?.trim() || null,
      },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update profile" };
  }

  revalidatePath("/agency/profile");
  return { success: true };
}
