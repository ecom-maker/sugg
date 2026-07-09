import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getHierarchyScope } from "@/lib/hierarchy-scope";

/** GET /api/agency/counselors?branchId= — counselors in branch not on active team */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const branchId = request.nextUrl.searchParams.get("branchId");
  const scope = await getHierarchyScope(user);

  const counselors = await prisma.agencyUser.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      ...(scope.agencyId ? { agencyId: scope.agencyId } : {}),
      user: { role: "AGENCY_COUNSELOR", isActive: true },
      teamMemberships: { none: { status: "ACTIVE" } },
    },
    include: { user: { select: { fullName: true, email: true } } },
    orderBy: { user: { fullName: "asc" } },
  });

  return NextResponse.json({ counselors });
}
