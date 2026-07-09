import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { canManageTeams } from "@/lib/hierarchy-scope";
import { addTeamMember } from "@/actions/teams";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || !canManageTeams(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { counselorId } = await request.json();
  if (!counselorId) return NextResponse.json({ error: "counselorId required" }, { status: 400 });

  const result = await addTeamMember(id, counselorId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
