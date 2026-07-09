import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";
import type { UniversityType, UniversityStatus } from "@prisma/client";

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  establishmentYear: z.coerce.number().int().min(1000).max(new Date().getFullYear()).optional(),
  location: z.string().min(1).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().min(1).optional(),
  website: z.string().url().optional().or(z.literal("")),
  universityType: z.enum(["PUBLIC", "PRIVATE", "DEEMED", "AUTONOMOUS", "INTERNATIONAL"]).nullable().optional(),
  accreditation: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  description: z.string().max(3000).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

/**
 * GET /api/universities/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const university = await prisma.university.findUnique({
    where: { id },
    include: {
      colleges: {
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          status: true,
          logoUrl: true,
          _count: { select: { courses: true, applications: true } },
        },
        orderBy: { name: "asc" },
      },
      _count: { select: { colleges: true } },
      createdBy: { select: { fullName: true } },
      updatedBy: { select: { fullName: true } },
    },
  });

  if (!university) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ university });
}

/**
 * PATCH /api/universities/[id]
 * Super Admin only
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.university.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Check name uniqueness if changing
    if (data.name && data.name !== existing.name) {
      const dup = await prisma.university.findFirst({
        where: { name: { equals: data.name, mode: "insensitive" }, id: { not: id } },
      });
      if (dup) return NextResponse.json({ error: "A university with this name already exists" }, { status: 409 });
    }

    const updated = await prisma.university.update({
      where: { id },
      data: {
        ...data,
        universityType: data.universityType as UniversityType | null | undefined,
        status: data.status as UniversityStatus | undefined,
        website: data.website || null,
        updatedById: user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        resource: "University",
        resourceId: id,
        oldValue: { name: existing.name, status: existing.status },
        newValue: { name: updated.name, status: updated.status },
      },
    });

    return NextResponse.json({ university: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[PATCH /api/universities/[id]]", err);
    return NextResponse.json({ error: "Failed to update university" }, { status: 500 });
  }
}

/**
 * DELETE /api/universities/[id]
 * Super Admin only — only if no colleges linked
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const university = await prisma.university.findUnique({
    where: { id },
    include: { _count: { select: { colleges: true } } },
  });
  if (!university) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (university._count.colleges > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${university._count.colleges} college(s) are linked to this university. Archive it instead.` },
      { status: 409 }
    );
  }

  await prisma.university.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "DELETE",
      resource: "University",
      resourceId: id,
      oldValue: { name: university.name },
    },
  });

  return NextResponse.json({ message: "University deleted" });
}
