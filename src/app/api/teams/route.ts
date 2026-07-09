import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { canManageTeams, getHierarchyScope } from "@/lib/hierarchy-scope";
import { createTeam } from "@/actions/teams";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = await getHierarchyScope(user);
  const branchId = request.nextUrl.searchParams.get("branchId");

  const where = {
    status: { not: "ARCHIVED" as const },
    ...(branchId ? { branchId } : {}),
    ...(scope.branchId ? { branchId: scope.branchId } : {}),
    ...(scope.agencyId && !scope.branchId
      ? { branch: { agencyId: scope.agencyId } }
      : {}),
  };

  const teams = await prisma.team.findMany({
    where,
    orderBy: { teamName: "asc" },
    include: {
      branch: { select: { branchName: true, branchCode: true } },
      district: { select: { districtName: true } },
      teamLead: { include: { user: { select: { fullName: true } } } },
      _count: { select: { members: { where: { status: "ACTIVE" } } } },
    },
  });

  return NextResponse.json({ teams });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || !canManageTeams(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await createTeam(body);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const team = await prisma.team.findUnique({
      where: { id: result.teamId },
      include: {
        branch: true,
        district: true,
        members: { where: { status: "ACTIVE" }, include: { counselor: { include: { user: true } } } },
      },
    });
    return NextResponse.json({ team }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/teams]", err);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}
