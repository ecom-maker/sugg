import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { canAccessHierarchy, getHierarchyScope } from "@/lib/hierarchy-scope";
import { getNodeMetrics } from "@/lib/hierarchy-metrics";

type TreeLevel = "country" | "state" | "district" | "branch" | "team" | "counselor";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || !canAccessHierarchy(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const level = (searchParams.get("level") ?? "country") as TreeLevel;
  const parentId = searchParams.get("parentId");
  const scope = await getHierarchyScope(user);

  try {
    const nodes = await loadTreeLevel(level, parentId, scope);
    const nodesWithMetrics = await Promise.all(
      nodes.map(async (node) => ({
        ...node,
        metrics: await getNodeMetrics(node.type, node.id, scope.agencyId),
        hasChildren: node.hasChildren,
      }))
    );
    return NextResponse.json({ nodes: nodesWithMetrics, level, parentId });
  } catch (err) {
    console.error("[hierarchy/tree]", err);
    return NextResponse.json({ error: "Failed to load tree" }, { status: 500 });
  }
}

async function loadTreeLevel(
  level: TreeLevel,
  parentId: string | null,
  scope: Awaited<ReturnType<typeof getHierarchyScope>>
) {
  switch (level) {
    case "country": {
      const countries = await prisma.country.findMany({
        where: { status: "ACTIVE" },
        orderBy: { countryName: "asc" },
      });
      return countries.map((c) => ({
        id: c.id,
        type: "country" as const,
        label: c.countryName,
        subtitle: c.countryCode,
        hasChildren: true,
      }));
    }

    case "state": {
      if (!parentId) throw new Error("parentId required");
      const states = await prisma.state.findMany({
        where: { countryId: parentId, status: "ACTIVE" },
        orderBy: { stateName: "asc" },
      });
      return states.map((s) => ({
        id: s.id,
        type: "state" as const,
        label: s.stateName,
        subtitle: s.stateCode ?? undefined,
        hasChildren: true,
      }));
    }

    case "district": {
      if (!parentId) throw new Error("parentId required");
      const districts = await prisma.district.findMany({
        where: { stateId: parentId, status: "ACTIVE" },
        orderBy: { districtName: "asc" },
      });
      return districts.map((d) => ({
        id: d.id,
        type: "district" as const,
        label: d.districtName,
        hasChildren: true,
      }));
    }

    case "branch": {
      if (!parentId) throw new Error("parentId required");
      const branchWhere = {
        districtId: parentId,
        status: "ACTIVE" as const,
        ...(scope.agencyId ? { agencyId: scope.agencyId } : {}),
        ...(scope.branchId ? { id: scope.branchId } : {}),
      };
      const branches = await prisma.agencyBranch.findMany({
        where: branchWhere,
        orderBy: { branchName: "asc" },
        include: { agency: { select: { name: true } } },
      });
      return branches.map((b) => ({
        id: b.id,
        type: "branch" as const,
        label: b.branchName,
        subtitle: b.agency.name,
        hasChildren: true,
      }));
    }

    case "team": {
      if (!parentId) throw new Error("parentId required");
      const teams = await prisma.team.findMany({
        where: { branchId: parentId, status: { not: "ARCHIVED" } },
        orderBy: { teamName: "asc" },
      });
      return teams.map((t) => ({
        id: t.id,
        type: "team" as const,
        label: t.teamName,
        subtitle: t.needsReview ? "Needs review" : undefined,
        hasChildren: true,
        needsReview: t.needsReview,
      }));
    }

    case "counselor": {
      if (!parentId) throw new Error("parentId required");
      const members = await prisma.teamMember.findMany({
        where: { teamId: parentId, status: "ACTIVE" },
        include: {
          counselor: {
            include: { user: { select: { id: true, fullName: true, role: true } } },
          },
        },
      });
      return members.map((m) => ({
        id: m.counselor.user.id,
        type: "counselor" as const,
        label: m.counselor.user.fullName,
        subtitle: m.counselor.user.role.replace(/_/g, " "),
        hasChildren: false,
        agencyUserId: m.counselor.id,
      }));
    }

    default:
      return [];
  }
}
