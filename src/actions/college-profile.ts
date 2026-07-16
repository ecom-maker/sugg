"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

interface ProfileData {
  name?: string;
  website?: string;
  contactPhone?: string;
  contactPersonName?: string;
  contactPersonDesig?: string;
  contactPersonPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  description?: string;
  establishedYear?: number;
  universityId?: string | null;
}

export async function updateCollegeProfile(collegeId: string, data: ProfileData) {
  const user = await getAuthUser();
  if (!user || !["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return { error: "Unauthorized" };
  }

  const existing = await prisma.college.findUnique({ where: { id: collegeId } });
  if (!existing) return { error: "College not found" };

  if (user.role === "COLLEGE_ADMIN") {
    const college = await prisma.college.findFirst({
      where: { id: collegeId, admin: { supabaseId: user.supabaseId } },
    });
    if (!college) return { error: "Access denied" };
  }

  try {
  if (data.universityId) {
    const university = await prisma.university.findUnique({ where: { id: data.universityId } });
    if (!university) return { error: "University not found" };
    if (university.status !== "ACTIVE") {
      return { error: "Selected university is not active" };
    }
  }

  await prisma.college.update({
    where: { id: collegeId },
    data: {
      ...(data.name && { name: data.name }),
      website: data.website || null,
      contactPhone: data.contactPhone || null,
      contactPersonName: data.contactPersonName || null,
      contactPersonDesig: data.contactPersonDesig || null,
      contactPersonPhone: data.contactPersonPhone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      pincode: data.pincode || null,
      description: data.description || null,
      establishedYear: data.establishedYear ?? null,
      ...(data.universityId !== undefined && { universityId: data.universityId || null }),
    },
  });

  if (data.universityId !== undefined && data.universityId !== existing.universityId) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UNIVERSITY_LINKED_TO_COLLEGE",
        resource: "College",
        resourceId: collegeId,
        oldValue: { universityId: existing.universityId },
        newValue: { universityId: data.universityId },
      },
    });
  }

  revalidatePath("/college/profile");
  return { success: true };
  } catch (e) {
    console.error("updateCollegeProfile error:", e);
    return { error: e instanceof Error ? e.message : "Could not save profile" };
  }
}
