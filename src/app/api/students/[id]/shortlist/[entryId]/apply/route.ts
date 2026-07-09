import { NextRequest, NextResponse } from "next/server";
import { applyFromShortlist } from "@/actions/student-profile";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const { id, entryId } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await applyFromShortlist(id, entryId, {
    documentOverrideReason: body.documentOverrideReason,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
