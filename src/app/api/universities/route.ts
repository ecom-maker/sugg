import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";
import type { UniversityType } from "@prisma/client";

const createSchema = z.object({
  name: z.string().min(2).max(200),
  establishmentYear: z.coerce.number().int().min(1000).max(new Date().getFullYear()),
  location: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().min(1),
  website: z.string().url().optional().or(z.literal("")),
  universityType: z.enum(["PUBLIC", "PRIVATE", "DEEMED", "AUTONOMOUS", "INTERNATIONAL"]).optional(),
  accreditation: z.string().optional(),
  logoUrl: z.string().optional(),
  description: z.string().max(3000).optional(),
});

/**
 * GET /api/universities
 * Query params: q (search), country, status, type, page, limit, sortBy, order
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const country = searchParams.get("country") ?? "";
  const status = searchParams.get("status") ?? "";
  const type = searchParams.get("type") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? "20"));
  const sortBy = searchParams.get("sortBy") ?? "name";
  const order = searchParams.get("order") === "desc" ? "desc" : "asc";

  const where: Record<string, unknown> = {};
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (country) where.country = { contains: country, mode: "insensitive" };
  if (status) where.status = status;
  if (type) where.universityType = type;

  const orderBy: Record<string, unknown> =
    sortBy === "year"
      ? { establishmentYear: order }
      : sortBy === "colleges"
      ? { colleges: { _count: order } }
      : { name: order };

  const [total, universities] = await Promise.all([
    prisma.university.count({ where: where as never }),
    prisma.university.findMany({
      where: where as never,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { colleges: true } },
        createdBy: { select: { fullName: true } },
      },
    }),
  ]);

  return NextResponse.json({
    universities,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * POST /api/universities
 * Super Admin only
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const existing = await prisma.university.findFirst({
      where: { name: { equals: data.name, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ error: "A university with this name already exists" }, { status: 409 });
    }

    const university = await prisma.university.create({
      data: {
        ...data,
        universityType: (data.universityType as UniversityType) ?? null,
        website: data.website || null,
        createdById: user.id,
        updatedById: user.id,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        resource: "University",
        resourceId: university.id,
        newValue: { name: university.name },
      },
    });

    return NextResponse.json({ university }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[POST /api/universities]", err);
    return NextResponse.json({ error: "Failed to create university" }, { status: 500 });
  }
}
