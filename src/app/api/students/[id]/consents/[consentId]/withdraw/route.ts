import { NextRequest, NextResponse } from "next/server";
import { withdrawConsent } from "@/actions/student-profile";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; consentId: string }> }
) {
  const { id, consentId } = await params;
  const result = await withdrawConsent(id, consentId);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
