"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const schema = z.object({
  name: z.string().min(2, "Course name is required").max(200),
  degreeType: z.enum(["DIPLOMA", "BACHELOR", "MASTER", "DOCTORATE", "CERTIFICATE", "OTHER"]),
  field: z.string().max(100).optional(),
  duration: z.string().max(60).optional(),
});

/** Add a course to the master catalog. Super Admin only. */
export async function createCatalogCourse(input: unknown) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") return { error: "Unauthorized" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const data = parsed.data;

  try {
    const course = await prisma.courseCatalog.create({
      data: {
        name: data.name.trim(),
        degreeType: data.degreeType,
        field: data.field?.trim() || null,
        duration: data.duration?.trim() || null,
      },
      select: { id: true, name: true, degreeType: true, field: true, duration: true },
    });
    revalidatePath("/admin/courses");
    return { success: true, course };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "This course already exists in the catalog (same name + degree)." };
    }
    console.error("[createCatalogCourse]", e);
    return { error: "Could not add course" };
  }
}
