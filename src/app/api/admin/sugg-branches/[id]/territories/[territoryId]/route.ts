import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/**
 * DELETE /api/admin/sugg-branches/[id]/territories/[territoryId]
 * Remove a coverage area from a Sugg Branch (audited).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; territoryId: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: suggBranchId, territoryId } = await params;

  try {
    const territory = await prisma.suggBranchTerritory.findFirst({
      where: { id: territoryId, suggBranchId },
    });
    if (!territory) {
      return NextResponse.json({ error: "Territory not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.suggBranchTerritory.delete({ where: { id: territoryId } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "REMOVE_SUGG_BRANCH_TERRITORY",
          resource: "sugg_branch_territory",
          resourceId: territoryId,
          oldValue: {
            suggBranchId,
            countryId: territory.countryId,
            stateId: territory.stateId,
            districtId: territory.districtId,
          },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE territory]", err);
    return NextResponse.json({ error: "Failed to remove territory" }, { status: 500 });
  }
}
