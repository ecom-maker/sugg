import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { requireStudentAccess } from "@/lib/student-scope";
import { prisma } from "@/lib/prisma";
import { captureConsent, withdrawConsent } from "@/actions/student-profile";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await requireStudentAccess(user, id, "read");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: 403 });

  const consents = await prisma.studentConsent.findMany({
    where: { studentId: id },
    include: { capturedBy: { select: { fullName: true } } },
    orderBy: { capturedAt: "desc" },
  });

  return NextResponse.json({ consents });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = await captureConsent(
    id,
    body.consentType,
    body.consentGiven ?? true,
    body.consentSource ?? "MANUAL"
  );
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
