"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { generateSlug } from "@/lib/utils";
import { createBulkNotifications } from "@/lib/notifications";

const createCollegeSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  officialEmail: z.string().email("Enter a valid email"),
  website: z.string().url().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  // Structured geography from the geo reference tables. The string
  // state/country columns are derived from these for backward compatibility.
  countryId: z.string().min(1, "Country is required"),
  stateId: z.string().optional(),
  districtId: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  description: z.string().optional(),
  establishedYear: z.string().optional(),
  universityId: z.string().optional(),
});

export async function createCollege(formData: FormData) {
  const user = await requireRole(["SUPER_ADMIN"]);

  const raw = Object.fromEntries(formData.entries());
  const parsed = createCollegeSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const baseSlug = generateSlug(data.name);

  // Ensure unique slug
  let slug = baseSlug;
  let count = 0;
  while (await prisma.college.findUnique({ where: { slug } })) {
    count++;
    slug = `${baseSlug}-${count}`;
  }

  // Resolve geo names from the selected reference ids, so the string
  // country/state columns stay consistent with the linked geo records.
  const [countryRec, stateRec, districtRec] = await Promise.all([
    prisma.country.findUnique({ where: { id: data.countryId }, select: { countryName: true } }),
    data.stateId
      ? prisma.state.findUnique({ where: { id: data.stateId }, select: { stateName: true } })
      : Promise.resolve(null),
    data.districtId
      ? prisma.district.findUnique({ where: { id: data.districtId }, select: { districtName: true } })
      : Promise.resolve(null),
  ]);

  if (!countryRec) {
    return { error: { countryId: ["Selected country is invalid"] } };
  }

  const college = await prisma.college.create({
    data: {
      name: data.name,
      slug,
      officialEmail: data.officialEmail,
      website: data.website || null,
      contactPhone: data.contactPhone || null,
      address: data.address || null,
      city: data.city || districtRec?.districtName || null,
      state: stateRec?.stateName ?? data.state ?? null,
      country: countryRec.countryName,
      countryId: data.countryId,
      stateId: data.stateId || null,
      districtId: data.districtId || null,
      description: data.description || null,
      establishedYear: data.establishedYear ? parseInt(data.establishedYear) : null,
      universityId: data.universityId || null,
      status: "PENDING",
    },
  });

  if (data.universityId) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UNIVERSITY_LINKED_TO_COLLEGE",
        resource: "College",
        resourceId: college.id,
        newValue: { universityId: data.universityId, collegeName: data.name },
      },
    });
  }

  revalidatePath("/admin/colleges");
  return { success: true, collegeId: college.id };
}

export async function updateCollegeStatus(
  collegeId: string,
  status: "APPROVED" | "REJECTED" | "SUSPENDED" | "ARCHIVED",
  reason?: string
) {
  const user = await requireRole(["SUPER_ADMIN"]);

  const college = await prisma.college.findUnique({
    where: { id: collegeId },
    include: { admin: { select: { id: true } } },
  });

  if (!college) return { error: "College not found" };

  await prisma.college.update({
    where: { id: collegeId },
    data: {
      status,
      approvedAt: status === "APPROVED" ? new Date() : undefined,
      rejectionReason: status === "REJECTED" ? reason : undefined,
    },
  });

  // Notify college admin
  if (college.adminId) {
    await createBulkNotifications([college.adminId], {
      type: "COLLEGE_APPROVED",
      title: `College ${status === "APPROVED" ? "Approved" : status}`,
      message: `${college.name} has been ${status.toLowerCase()}${reason ? `: ${reason}` : ""}`,
      resourceId: collegeId,
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: `COLLEGE_${status}`,
      resource: "college",
      resourceId: collegeId,
      newValue: { status, reason },
    },
  });

  revalidatePath("/admin/colleges");
  revalidatePath(`/admin/colleges/${collegeId}`);
  return { success: true };
}

const createCourseSchema = z.object({
  name: z.string().min(2),
  degreeType: z.enum(["DIPLOMA", "BACHELOR", "MASTER", "DOCTORATE", "CERTIFICATE", "OTHER"]),
  duration: z.string().min(1),
  durationMonths: z.string().optional(),
  eligibility: z.string().optional(),
  totalSeats: z.string().optional(),
  annualFee: z.string().optional(),
  semesterFee: z.string().optional(),
  totalFee: z.string().optional(),
  description: z.string().optional(),
});

export async function createCourse(collegeId: string, formData: FormData) {
  const user = await requireRole(["COLLEGE_ADMIN", "SUPER_ADMIN"]);

  // Verify college ownership for COLLEGE_ADMIN
  if (user.role === "COLLEGE_ADMIN") {
    const college = await prisma.college.findUnique({
      where: { id: collegeId, adminId: user.id },
    });
    if (!college) return { error: "Unauthorized" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = createCourseSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const course = await prisma.course.create({
    data: {
      collegeId,
      name: data.name,
      degreeType: data.degreeType,
      duration: data.duration,
      durationMonths: data.durationMonths ? parseInt(data.durationMonths) : null,
      eligibility: data.eligibility || null,
      totalSeats: data.totalSeats ? parseInt(data.totalSeats) : null,
      annualFee: data.annualFee ? parseFloat(data.annualFee) : null,
      semesterFee: data.semesterFee ? parseFloat(data.semesterFee) : null,
      totalFee: data.totalFee ? parseFloat(data.totalFee) : null,
      description: data.description || null,
    },
  });

  revalidatePath(`/college/courses`);
  revalidatePath(`/admin/colleges/${collegeId}`);
  return { success: true, courseId: course.id };
}
