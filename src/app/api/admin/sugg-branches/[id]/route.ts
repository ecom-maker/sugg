import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  branchName: z.string().min(2).max(120).optional(),
  branchCode: z.string().min(2).max(40).optional(),
  address: z.string().max(500).optional().nullable(),
  countryId: z.string().min(1).optional(),
  stateId: z.string().optional().nullable(),
  districtId: z.string().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  managerId: z.string().optional().nullable(),
});

/**
 * GET /api/admin/sugg-branches/[id]
 * Detail: info + manager, territories, agencies in territory, Sugg counselors.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const branch = await prisma.suggBranch.findUnique({
    where: { id },
    include: {
      manager: { select: { id: true, fullName: true, email: true, phone: true } },
      geoCountry: { select: { id: true, countryName: true } },
      geoState: { select: { id: true, stateName: true } },
      geoDistrict: { select: { id: true, districtName: true } },
      territories: {
        include: {
          geoCountry: { select: { countryName: true } },
          geoState: { select: { stateName: true } },
          geoDistrict: { select: { districtName: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      agencies: {
        select: {
          id: true,
          name: true,
          approvalStatus: true,
          isActive: true,
          _count: { select: { branches: true } },
        },
        orderBy: { name: "asc" },
      },
      counselors: {
        include: { user: { select: { id: true, fullName: true, email: true, isActive: true } } },
      },
    },
  });

  if (!branch) return NextResponse.json({ error: "Sugg Branch not found" }, { status: 404 });
  return NextResponse.json({ branch });
}

/**
 * PUT /api/admin/sugg-branches/[id]
 * Update info / status / manager. Manager change is audited separately.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.suggBranch.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Sugg Branch not found" }, { status: 404 });

    // Uniqueness guards on name/code if changed.
    if (data.branchName && data.branchName !== existing.branchName) {
      const dupe = await prisma.suggBranch.findFirst({ where: { branchName: data.branchName, id: { not: id } } });
      if (dupe) return NextResponse.json({ error: "A Sugg Branch with this name already exists" }, { status: 409 });
    }
    if (data.branchCode && data.branchCode !== existing.branchCode) {
      const dupe = await prisma.suggBranch.findFirst({ where: { branchCode: data.branchCode, id: { not: id } } });
      if (dupe) return NextResponse.json({ error: "A Sugg Branch with this code already exists" }, { status: 409 });
    }

    const managerChanged =
      data.managerId !== undefined && (data.managerId || null) !== existing.managerId;

    if (managerChanged && data.managerId) {
      const otherBranch = await prisma.suggBranch.findFirst({
        where: { managerId: data.managerId, id: { not: id } },
        select: { branchName: true },
      });
      if (otherBranch) {
        return NextResponse.json(
          { error: `That user already manages ${otherBranch.branchName}` },
          { status: 409 }
        );
      }
    }

    const branch = await prisma.$transaction(async (tx) => {
      const updated = await tx.suggBranch.update({
        where: { id },
        data: {
          ...(data.branchName !== undefined ? { branchName: data.branchName } : {}),
          ...(data.branchCode !== undefined ? { branchCode: data.branchCode } : {}),
          ...(data.address !== undefined ? { address: data.address || null } : {}),
          ...(data.countryId !== undefined ? { countryId: data.countryId } : {}),
          ...(data.stateId !== undefined ? { stateId: data.stateId || null } : {}),
          ...(data.districtId !== undefined ? { districtId: data.districtId || null } : {}),
          ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
          ...(data.email !== undefined ? { email: data.email || null } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.managerId !== undefined ? { managerId: data.managerId || null } : {}),
          updatedById: user.id,
        },
      });

      if (managerChanged) {
        // Promote the newly assigned manager.
        if (data.managerId) {
          await tx.user.update({
            where: { id: data.managerId },
            data: { role: "SUGG_BRANCH_MANAGER", isActive: true },
          });
        }
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "ASSIGN_SUGG_BRANCH_MANAGER",
            resource: "sugg_branch",
            resourceId: id,
            oldValue: { managerId: existing.managerId },
            newValue: { managerId: data.managerId || null },
          },
        });
      }

      const action =
        data.status === "ARCHIVED" && existing.status !== "ARCHIVED"
          ? "ARCHIVE_SUGG_BRANCH"
          : "UPDATE_SUGG_BRANCH";
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action,
          resource: "sugg_branch",
          resourceId: id,
          newValue: { branchName: updated.branchName, status: updated.status },
        },
      });

      return updated;
    });

    return NextResponse.json({ branch });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[PUT /api/admin/sugg-branches/[id]]", err);
    return NextResponse.json({ error: "Failed to update Sugg Branch" }, { status: 500 });
  }
}
