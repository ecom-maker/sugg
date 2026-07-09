"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, getAuthUser } from "@/lib/auth";
import type { UniversityStatus, UniversityType } from "@/types";

const universitySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  establishmentYear: z.coerce
    .number()
    .int()
    .min(1000, "Year must be 1000 or later")
    .max(new Date().getFullYear(), "Year cannot be in the future"),
  location: z.string().min(1, "Location is required"),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  website: z.string().url().optional().or(z.literal("")),
  universityType: z
    .enum(["PUBLIC", "PRIVATE", "DEEMED", "AUTONOMOUS", "INTERNATIONAL"])
    .optional(),
  accreditation: z.string().optional(),
  logoUrl: z.string().optional(),
  description: z.string().max(3000).optional(),
});

async function logUniversityAction(
  userId: string,
  action: string,
  resourceId: string,
  oldValue?: Prisma.InputJsonValue,
  newValue?: Prisma.InputJsonValue
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resource: "University",
      resourceId,
      oldValue,
      newValue,
    },
  });
}

export async function createUniversity(data: z.infer<typeof universitySchema>) {
  const user = await requireRole(["SUPER_ADMIN"]);
  const parsed = universitySchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.university.findFirst({
    where: { name: { equals: parsed.data.name, mode: "insensitive" } },
  });
  if (existing) return { error: "A university with this name already exists" };

  const university = await prisma.university.create({
    data: {
      ...parsed.data,
      universityType: (parsed.data.universityType as UniversityType) ?? null,
      website: parsed.data.website || null,
      accreditation: parsed.data.accreditation || null,
      logoUrl: parsed.data.logoUrl || null,
      description: parsed.data.description || null,
      createdById: user.id,
      updatedById: user.id,
    },
  });

  await logUniversityAction(user.id, "UNIVERSITY_CREATED", university.id, undefined, {
    name: university.name,
  });

  revalidatePath("/admin/universities");
  return { success: true, universityId: university.id };
}

export async function updateUniversity(
  universityId: string,
  data: Partial<z.infer<typeof universitySchema>> & { status?: UniversityStatus }
) {
  const user = await requireRole(["SUPER_ADMIN"]);

  const existing = await prisma.university.findUnique({ where: { id: universityId } });
  if (!existing) return { error: "University not found" };

  if (data.name && data.name !== existing.name) {
    const dup = await prisma.university.findFirst({
      where: { name: { equals: data.name, mode: "insensitive" }, id: { not: universityId } },
    });
    if (dup) return { error: "A university with this name already exists" };
  }

  const updated = await prisma.university.update({
    where: { id: universityId },
    data: {
      ...data,
      universityType: data.universityType as UniversityType | undefined,
      website: data.website === "" ? null : data.website,
      updatedById: user.id,
    },
  });

  await logUniversityAction(
    user.id,
    "UNIVERSITY_UPDATED",
    universityId,
    { name: existing.name, status: existing.status },
    { name: updated.name, status: updated.status }
  );

  revalidatePath("/admin/universities");
  revalidatePath(`/admin/universities/${universityId}`);
  return { success: true };
}

export async function archiveUniversity(universityId: string) {
  const user = await requireRole(["SUPER_ADMIN"]);
  const existing = await prisma.university.findUnique({ where: { id: universityId } });
  if (!existing) return { error: "University not found" };

  await prisma.university.update({
    where: { id: universityId },
    data: { status: "ARCHIVED", updatedById: user.id },
  });

  await logUniversityAction(
    user.id,
    "UNIVERSITY_ARCHIVED",
    universityId,
    { status: existing.status },
    { status: "ARCHIVED" }
  );

  revalidatePath("/admin/universities");
  revalidatePath(`/admin/universities/${universityId}`);
  return { success: true };
}

export async function setUniversityStatus(universityId: string, status: UniversityStatus) {
  const user = await requireRole(["SUPER_ADMIN"]);
  const existing = await prisma.university.findUnique({ where: { id: universityId } });
  if (!existing) return { error: "University not found" };

  await prisma.university.update({
    where: { id: universityId },
    data: { status, updatedById: user.id },
  });

  const action =
    status === "ARCHIVED"
      ? "UNIVERSITY_ARCHIVED"
      : status === "ACTIVE"
      ? "UNIVERSITY_ACTIVATED"
      : "UNIVERSITY_DEACTIVATED";

  await logUniversityAction(
    user.id,
    action,
    universityId,
    { status: existing.status },
    { status }
  );

  revalidatePath("/admin/universities");
  revalidatePath(`/admin/universities/${universityId}`);
  return { success: true };
}

export async function deleteUniversity(universityId: string) {
  const user = await requireRole(["SUPER_ADMIN"]);

  const university = await prisma.university.findUnique({
    where: { id: universityId },
    include: { _count: { select: { colleges: true } } },
  });
  if (!university) return { error: "University not found" };

  if (university._count.colleges > 0) {
    return {
      error: `Cannot delete: ${university._count.colleges} college(s) are linked. Archive instead.`,
    };
  }

  await prisma.university.delete({ where: { id: universityId } });

  await logUniversityAction(user.id, "UNIVERSITY_DELETED", universityId, {
    name: university.name,
  });

  revalidatePath("/admin/universities");
  return { success: true };
}

export async function linkCollegeToUniversity(collegeId: string, universityId: string | null) {
  const user = await getAuthUser();
  if (!user) return { error: "Unauthorized" };

  const college = await prisma.college.findUnique({ where: { id: collegeId } });
  if (!college) return { error: "College not found" };

  if (user.role === "COLLEGE_ADMIN") {
    const owned = await prisma.college.findFirst({
      where: { id: collegeId, admin: { supabaseId: user.supabaseId } },
    });
    if (!owned) return { error: "Access denied" };
  } else if (user.role !== "SUPER_ADMIN") {
    return { error: "Unauthorized" };
  }

  if (universityId) {
    const university = await prisma.university.findUnique({ where: { id: universityId } });
    if (!university) return { error: "University not found" };
    if (university.status === "ARCHIVED") {
      return { error: "Cannot link to an archived university" };
    }
  }

  await prisma.college.update({
    where: { id: collegeId },
    data: { universityId },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "UNIVERSITY_LINKED_TO_COLLEGE",
      resource: "College",
      resourceId: collegeId,
      oldValue: { universityId: college.universityId },
      newValue: { universityId },
    },
  });

  revalidatePath("/admin/colleges");
  revalidatePath("/college/profile");
  if (universityId) revalidatePath(`/admin/universities/${universityId}`);
  return { success: true };
}

export async function searchUniversities(query: string, activeOnly = true) {
  const user = await getAuthUser();
  if (!user) return [];

  const universities = await prisma.university.findMany({
    where: {
      ...(activeOnly ? { status: "ACTIVE" } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { city: { contains: query, mode: "insensitive" } },
              { country: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 20,
    select: {
      id: true,
      name: true,
      establishmentYear: true,
      location: true,
      city: true,
      country: true,
      status: true,
    },
  });

  return universities;
}
