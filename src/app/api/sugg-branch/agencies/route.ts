import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getSuggBranchScope } from "@/lib/sugg-branch-scope";

/**
 * GET /api/sugg-branch/agencies
 * Agencies within the manager's territory (read-only). Query: status, q.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUGG_BRANCH_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = await getSuggBranchScope(user);
  if (!scope) {
    return NextResponse.json({ error: "No Sugg Branch assigned to this manager" }, { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? "";
  const q = searchParams.get("q") ?? "";

  const where: Record<string, unknown> = { suggBranchId: scope.suggBranchId };
  if (status) where.approvalStatus = status;
  if (q) where.name = { contains: q, mode: "insensitive" };

  const agencies = await prisma.agency.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
    include: {
      geoState: { select: { stateName: true } },
      geoDistrict: { select: { districtName: true } },
      recommendedBy: { select: { fullName: true } },
      _count: { select: { branches: true, agencyUsers: true, commissions: true } },
    },
  });

  return NextResponse.json({ agencies });
}
