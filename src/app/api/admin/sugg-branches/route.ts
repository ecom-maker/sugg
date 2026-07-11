import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { generateSuggBranchCode } from "@/lib/sugg-branch-code";
import { z } from "zod";

const createSchema = z.object({
  branchName: z.string().min(2).max(120),
  // Optional — auto-generated from the branch's geography when omitted.
  branchCode: z.string().max(40).optional(),
  address: z.string().max(500).optional(),
  countryId: z.string().min(1, "Country is required"),
  stateId: z.string().optional().nullable(),
  districtId: z.string().optional().nullable(),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional().or(z.literal("")),
  managerId: z.string().optional().nullable(),
});

/**
 * GET /api/admin/sugg-branches
 * Query: q, status, page, limit
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? "20"));

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { branchName: { contains: q, mode: "insensitive" } },
      { branchCode: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;

  const [total, branches] = await Promise.all([
    prisma.suggBranch.count({ where: where as never }),
    prisma.suggBranch.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        manager: { select: { id: true, fullName: true, email: true } },
        geoCountry: { select: { countryName: true } },
        geoState: { select: { stateName: true } },
        _count: { select: { territories: true, agencies: true, counselors: true } },
      },
    }),
  ]);

  return NextResponse.json({
    branches,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * POST /api/admin/sugg-branches
 * Super Admin only. Creates a Sugg Branch and (optionally) assigns a manager.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    // Branch name must be unique.
    const nameDupe = await prisma.suggBranch.findFirst({
      where: { branchName: data.branchName },
      select: { id: true },
    });
    if (nameDupe) {
      return NextResponse.json(
        { error: "A Sugg Branch with this name already exists" },
        { status: 409 }
      );
    }

    // Auto-generate the branch code from geography unless one was supplied.
    const branchCode =
      data.branchCode?.trim() ||
      (await generateSuggBranchCode({
        countryId: data.countryId,
        stateId: data.stateId,
        districtId: data.districtId,
      }));

    const codeDupe = await prisma.suggBranch.findFirst({
      where: { branchCode },
      select: { id: true },
    });
    if (codeDupe) {
      return NextResponse.json(
        { error: `A Sugg Branch with code ${branchCode} already exists` },
        { status: 409 }
      );
    }

    if (data.managerId) {
      const existingManaged = await prisma.suggBranch.findFirst({
        where: { managerId: data.managerId },
        select: { branchName: true },
      });
      if (existingManaged) {
        return NextResponse.json(
          { error: `That user already manages ${existingManaged.branchName}` },
          { status: 409 }
        );
      }
    }

    const branch = await prisma.$transaction(async (tx) => {
      const created = await tx.suggBranch.create({
        data: {
          branchName: data.branchName,
          branchCode,
          address: data.address || null,
          countryId: data.countryId,
          stateId: data.stateId || null,
          districtId: data.districtId || null,
          phone: data.phone || null,
          email: data.email || null,
          managerId: data.managerId || null,
          createdById: user.id,
          updatedById: user.id,
        },
      });

      // Promote the assigned user to the SUGG_BRANCH_MANAGER role.
      if (data.managerId) {
        await tx.user.update({
          where: { id: data.managerId },
          data: { role: "SUGG_BRANCH_MANAGER", isActive: true },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE_SUGG_BRANCH",
          resource: "sugg_branch",
          resourceId: created.id,
          newValue: {
            branchName: created.branchName,
            branchCode: created.branchCode,
            managerId: created.managerId,
          },
        },
      });

      return created;
    });

    return NextResponse.json({ branch }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[POST /api/admin/sugg-branches]", err);
    return NextResponse.json({ error: "Failed to create Sugg Branch" }, { status: 500 });
  }
}
