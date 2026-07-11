import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getSuggBranchScope, isCounselorInScope } from "@/lib/sugg-branch-scope";
import { z } from "zod";

const schema = z.object({
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  specializations: z.array(z.string()).optional(),
  maxLeads: z.coerce.number().int().min(1).max(500).optional(),
});

/**
 * PATCH /api/sugg-branch/counselors/[id]
 * Update a Sugg counselor in the manager's branch (enable/disable, availability,
 * specializations, capacity). Write is guarded to own-branch counselors only.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUGG_BRANCH_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const scope = await getSuggBranchScope(user);
  if (!scope) {
    return NextResponse.json({ error: "No Sugg Branch assigned to this manager" }, { status: 404 });
  }
  if (!(await isCounselorInScope(scope.suggBranchId, id))) {
    return NextResponse.json({ error: "Counselor is not in your branch" }, { status: 403 });
  }

  try {
    const data = schema.parse(await request.json());

    const counselor = await prisma.counselor.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!counselor) return NextResponse.json({ error: "Counselor not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      if (data.isAvailable !== undefined || data.specializations || data.maxLeads !== undefined) {
        await tx.counselor.update({
          where: { id },
          data: {
            ...(data.isAvailable !== undefined ? { isAvailable: data.isAvailable } : {}),
            ...(data.specializations ? { specializations: data.specializations } : {}),
            ...(data.maxLeads !== undefined ? { maxLeads: data.maxLeads } : {}),
          },
        });
      }
      if (data.isActive !== undefined) {
        await tx.user.update({ where: { id: counselor.userId }, data: { isActive: data.isActive } });
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: data.isActive === false ? "DISABLE_SUGG_COUNSELOR" : "UPDATE_SUGG_COUNSELOR",
          resource: "counselor",
          resourceId: id,
          newValue: { ...data },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[PATCH sugg-branch/counselors/[id]]", err);
    return NextResponse.json({ error: "Failed to update counselor" }, { status: 500 });
  }
}
