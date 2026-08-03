"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { AGENCY_TERMS_VERSION } from "@/components/agency/terms-content";

/**
 * Records the Agency's electronic acceptance of the Terms & Conditions.
 * Only the agency owner may accept. The acting owner is stamped against the
 * agency and an immutable audit entry is written.
 */
export async function acceptAgencyTerms() {
  const user = await getAuthUser();
  if (!user || user.role !== "AGENCY_OWNER") {
    return { error: "Only the agency owner can accept these terms." };
  }

  const agency = await prisma.agency.findFirst({
    where: { owner: { supabaseId: user.supabaseId } },
    select: { id: true, name: true, termsAcceptedAt: true },
  });
  if (!agency) return { error: "Agency not found" };
  if (agency.termsAcceptedAt) return { success: true }; // already accepted

  const acceptedBy = user.fullName ?? user.email ?? user.id;
  await prisma.agency.update({
    where: { id: agency.id },
    data: { termsAcceptedAt: new Date(), termsAcceptedById: user.id },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "TERMS_ACCEPTED",
      resource: "Agency",
      resourceId: agency.id,
      newValue: { acceptedBy, termsVersion: AGENCY_TERMS_VERSION } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/agency");
  revalidatePath("/agency/profile");
  return { success: true };
}
