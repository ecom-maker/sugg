import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { canManageTeams } from "@/lib/hierarchy-scope";
import { removeTeamMember } from "@/actions/teams";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; counselorId: string }> }
) {
  const user = await getAuthUser();
  if (!user || !canManageTeams(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, counselorId } = await params;
  const result = await removeTeamMember(id, counselorId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
