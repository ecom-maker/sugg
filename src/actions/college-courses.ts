"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { DegreeType } from "@/types";
import { Prisma, type CommissionType } from "@prisma/client";
import type { SlabRule } from "@/lib/commission-calculator";

interface CourseData {
  name: string;
  degreeType: DegreeType;
  duration: string;
  durationMonths?: number;
  eligibility?: string;
  totalSeats?: number;
  availableSeats?: number;
  annualFee?: number;
  totalFee?: number;
  description?: string;
  isActive: boolean;
  // Commission
  commissionType?: string;
  commissionValue?: number;
  commissionCurrency?: string;
  commissionRules?: SlabRule[];
}

export async function upsertCourse(courseId: string | undefined, data: CourseData) {
  const user = await getAuthUser();
  if (!user || !["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return { error: "Unauthorized" };
  }

  const college = await prisma.college.findFirst({
    where: { admin: { supabaseId: user.supabaseId } },
  });

  if (!college && user.role !== "SUPER_ADMIN") return { error: "College not found" };

  const commType = data.commissionType as CommissionType | undefined;

  const payload = {
    name: data.name,
    degreeType: data.degreeType,
    duration: data.duration,
    durationMonths: data.durationMonths ?? null,
    eligibility: data.eligibility || null,
    totalSeats: data.totalSeats ?? null,
    availableSeats: data.availableSeats ?? null,
    annualFee: data.annualFee ?? null,
    totalFee: data.totalFee ?? null,
    description: data.description || null,
    isActive: data.isActive,
    commissionType: commType || null,
    commissionValue: data.commissionValue ?? null,
    commissionCurrency: data.commissionCurrency || "INR",
    commissionRules: data.commissionRules && data.commissionRules.length > 0
      ? (data.commissionRules as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull,
  };

  if (courseId) {
    const existing = await prisma.course.findUnique({ where: { id: courseId } });
    if (!existing) return { error: "Course not found" };
    if (college && existing.collegeId !== college.id) return { error: "Access denied" };

    await prisma.course.update({ where: { id: courseId }, data: payload });

    // Record a field-level diff into the college's change history.
    const norm = (v: unknown) =>
      v && typeof v === "object" && "toString" in v ? (v as { toString(): string }).toString() : v;
    const FIELDS = [
      "name", "degreeType", "duration", "durationMonths", "eligibility", "totalSeats",
      "availableSeats", "annualFee", "totalFee", "description", "isActive",
      "commissionType", "commissionValue", "commissionCurrency",
    ];
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};
    const ex = existing as unknown as Record<string, unknown>;
    const pl = payload as unknown as Record<string, unknown>;
    for (const key of FIELDS) {
      const before = norm(ex[key] ?? null);
      const after = norm(pl[key] ?? null);
      if (String(before ?? "") !== String(after ?? "")) {
        oldValue[key] = before;
        newValue[key] = after;
      }
    }
    if (Object.keys(newValue).length > 0) {
      oldValue.course = existing.name;
      newValue.course = payload.name;
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "COURSE_UPDATED",
          resource: "College",
          resourceId: existing.collegeId,
          oldValue: oldValue as Prisma.InputJsonValue,
          newValue: newValue as Prisma.InputJsonValue,
        },
      });
    }
    revalidatePath(`/admin/colleges/${existing.collegeId}`);
  } else {
    if (!college) return { error: "No college found for your account" };
    await prisma.course.create({ data: { ...payload, collegeId: college.id } });
    revalidatePath(`/admin/colleges/${college.id}`);
  }

  revalidatePath("/college/courses");
  return { success: true };
}

export async function deleteCourse(courseId: string) {
  const user = await getAuthUser();
  if (!user || !["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return { error: "Unauthorized" };
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { _count: { select: { applications: true } } },
  });

  if (!course) return { error: "Course not found" };

  if (course._count.applications > 0) {
    // Soft-delete: mark as inactive
    await prisma.course.update({ where: { id: courseId }, data: { isActive: false } });
  } else {
    await prisma.course.delete({ where: { id: courseId } });
  }

  revalidatePath("/college/courses");
  return { success: true };
}
