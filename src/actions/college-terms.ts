"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { TERMS_VERSION } from "@/components/college/terms-content";

/**
 * Records the College's electronic acceptance of the Terms & Conditions.
 * The acting Authorized User (the signed-in college account) is stamped
 * against the college, and an immutable audit entry is written.
 */
export async function acceptCollegeTerms() {
  const user = await getAuthUser();
  if (!user || user.role !== "COLLEGE_ADMIN") {
    return { error: "Only a college account can accept these terms." };
  }

  const college = await prisma.college.findFirst({
    where: { admin: { supabaseId: user.supabaseId } },
    select: { id: true, name: true, termsAcceptedAt: true },
  });
  if (!college) return { error: "College not found" };
  if (college.termsAcceptedAt) return { success: true }; // already accepted

  const acceptedBy = user.fullName ?? user.email ?? user.id;
  await prisma.college.update({
    where: { id: college.id },
    data: { termsAcceptedAt: new Date(), termsAcceptedById: user.id },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "TERMS_ACCEPTED",
      resource: "College",
      resourceId: college.id,
      newValue: { acceptedBy, termsVersion: TERMS_VERSION } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/college");
  revalidatePath("/college/profile");
  return { success: true };
}
