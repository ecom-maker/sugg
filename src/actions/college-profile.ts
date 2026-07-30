"use server";

import { Prisma } from "@prisma/client";
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

    // Build the exact update payload (mirrors the previous write behaviour).
    const updateData: Record<string, unknown> = {
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
    };
    if (data.name) updateData.name = data.name;
    if (data.universityId !== undefined) updateData.universityId = data.universityId || null;

    // Diff against the current record so we record exactly what changed, by whom.
    const TRACKED: Record<string, string> = {
      name: "Name", website: "Website", contactPhone: "Contact Phone",
      contactPersonName: "Contact Person", contactPersonDesig: "Contact Person Designation",
      contactPersonPhone: "Contact Person Phone", address: "Address", city: "City",
      state: "State", country: "Country", pincode: "Pincode", description: "Description",
      establishedYear: "Established Year", universityId: "University",
    };
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};
    const rec = existing as unknown as Record<string, unknown>;
    for (const key of Object.keys(TRACKED)) {
      if (!(key in updateData)) continue;
      const before = rec[key] ?? null;
      const after = updateData[key] ?? null;
      if (String(before ?? "") !== String(after ?? "")) {
        oldValue[key] = before;
        newValue[key] = after;
      }
    }

    // Store readable university names in the log instead of opaque ids.
    if ("universityId" in newValue) {
      const [oldU, newU] = await Promise.all([
        existing.universityId
          ? prisma.university.findUnique({ where: { id: existing.universityId }, select: { name: true } })
          : Promise.resolve(null),
        updateData.universityId
          ? prisma.university.findUnique({ where: { id: updateData.universityId as string }, select: { name: true } })
          : Promise.resolve(null),
      ]);
      oldValue.universityId = oldU?.name ?? null;
      newValue.universityId = newU?.name ?? null;
    }

    await prisma.college.update({ where: { id: collegeId }, data: updateData });

    // Record a single audit entry summarising the change set.
    if (Object.keys(newValue).length > 0) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "COLLEGE_UPDATED",
          resource: "College",
          resourceId: collegeId,
          oldValue: oldValue as Prisma.InputJsonValue,
          newValue: newValue as Prisma.InputJsonValue,
        },
      });
    }

    revalidatePath("/college/profile");
    revalidatePath(`/admin/colleges/${collegeId}`);
    return { success: true };
  } catch (e) {
    console.error("updateCollegeProfile error:", e);
    return { error: e instanceof Error ? e.message : "Could not save profile" };
  }
}
