import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { canAccessHierarchy, getHierarchyScope } from "@/lib/hierarchy-scope";
import { getNodeMetrics } from "@/lib/hierarchy-metrics";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const user = await getAuthUser();
  if (!user || !canAccessHierarchy(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, id } = await params;
  const scope = await getHierarchyScope(user);
  const metrics = await getNodeMetrics(type, id, scope.agencyId);

  return NextResponse.json({ type, id, metrics });
}
