import { NextRequest, NextResponse } from "next/server";
import { mergeStudents } from "@/actions/student-profile";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await mergeStudents(body.survivingId, body.duplicateId);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
