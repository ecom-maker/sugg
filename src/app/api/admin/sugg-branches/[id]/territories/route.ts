import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { validateTerritoryNoOverlap } from "@/lib/sugg-territory";
import { z } from "zod";

const createSchema = z.object({
  countryId: z.string().min(1, "Country is required"),
  stateId: z.string().optional().nullable(),
  districtId: z.string().optional().nullable(),
});

/**
 * POST /api/admin/sugg-branches/[id]/territories
 * Add a coverage area with overlap validation (spec §1).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: suggBranchId } = await params;

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const branch = await prisma.suggBranch.findUnique({
      where: { id: suggBranchId },
      select: { id: true },
    });
    if (!branch) return NextResponse.json({ error: "Sugg Branch not found" }, { status: 404 });

    // Normalize: an empty string is treated as "not set" (broader coverage).
    const stateId = data.stateId || null;
    const districtId = data.districtId || null;

    const overlap = await validateTerritoryNoOverlap({
      suggBranchId,
      countryId: data.countryId,
      stateId,
      districtId,
    });
    if (!overlap.ok && overlap.conflict) {
      return NextResponse.json(
        {
          error: `This ${overlap.conflict.level} is already covered by ${overlap.conflict.branchName}`,
          conflict: overlap.conflict,
        },
        { status: 409 }
      );
    }

    const territory = await prisma.$transaction(async (tx) => {
      const created = await tx.suggBranchTerritory.create({
        data: { suggBranchId, countryId: data.countryId, stateId, districtId },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ADD_SUGG_BRANCH_TERRITORY",
          resource: "sugg_branch_territory",
          resourceId: created.id,
          newValue: { suggBranchId, countryId: data.countryId, stateId, districtId },
        },
      });
      return created;
    });

    return NextResponse.json({ territory }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[POST territories]", err);
    return NextResponse.json({ error: "Failed to add territory" }, { status: 500 });
  }
}
