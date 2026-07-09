import { NextRequest, NextResponse } from "next/server";
import { verifyStudentDocument } from "@/actions/student-profile";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;
  const body = await request.json();
  const status = body.status === "REJECTED" ? "REJECTED" : "VERIFIED";
  const result = await verifyStudentDocument(id, docId, status);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
