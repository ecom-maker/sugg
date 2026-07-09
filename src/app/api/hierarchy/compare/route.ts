import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { canAccessHierarchy, getHierarchyScope } from "@/lib/hierarchy-scope";
import { getNodeMetrics, type HierarchyMetrics } from "@/lib/hierarchy-metrics";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || !canAccessHierarchy(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type") ?? "geography";
  const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").filter(Boolean);

  if (ids.length < 2) {
    return NextResponse.json({ error: "At least 2 ids required for comparison" }, { status: 400 });
  }

  const scope = await getHierarchyScope(user);

  if (type === "team") {
    const teams = await prisma.team.findMany({
      where: {
        id: { in: ids },
        ...(scope.agencyId
          ? { branch: { agencyId: scope.agencyId } }
          : {}),
        ...(scope.branchId ? { branchId: scope.branchId } : {}),
      },
      include: {
        branch: { select: { branchName: true } },
        district: { select: { districtName: true } },
      },
    });

    const results = await Promise.all(
      teams.map(async (t) => ({
        id: t.id,
        label: t.teamName,
        subtitle: `${t.branch.branchName} · ${t.district.districtName}`,
        metrics: await getNodeMetrics("team", t.id, scope.agencyId),
      }))
    );
    return NextResponse.json({ type: "team", items: results });
  }

  // geography comparison — ids are node ids with level prefix or pass level param
  const level = request.nextUrl.searchParams.get("level") ?? "state";
  const results: { id: string; label: string; subtitle?: string; metrics: HierarchyMetrics }[] = [];

  for (const id of ids) {
    let label = id;
    let subtitle: string | undefined;

    if (level === "country") {
      const c = await prisma.country.findUnique({ where: { id } });
      label = c?.countryName ?? id;
    } else if (level === "state") {
      const s = await prisma.state.findUnique({ where: { id }, include: { country: true } });
      label = s?.stateName ?? id;
      subtitle = s?.country.countryName;
    } else if (level === "district") {
      const d = await prisma.district.findUnique({
        where: { id },
        include: { state: { include: { country: true } } },
      });
      label = d?.districtName ?? id;
      subtitle = d ? `${d.state.stateName}, ${d.state.country.countryName}` : undefined;
    }

    results.push({
      id,
      label,
      subtitle,
      metrics: await getNodeMetrics(level, id, scope.agencyId),
    });
  }

  return NextResponse.json({ type: "geography", level, items: results });
}
