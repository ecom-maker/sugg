import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { requireStudentAccess } from "@/lib/student-scope";
import { prisma } from "@/lib/prisma";
import { getSignedDocumentUrl } from "@/lib/student-storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, docId } = await params;
  const access = await requireStudentAccess(user, id, "read");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: 403 });

  const doc = await prisma.studentDocument.findFirst({
    where: { id: docId, studentId: id, status: "ACTIVE" },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = await getSignedDocumentUrl(doc.fileUrl);
  if (!url) return NextResponse.json({ error: "Could not generate URL" }, { status: 500 });

  return NextResponse.json({ url, expiresIn: 300 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { archiveStudentDocument } = await import("@/actions/student-profile");
  const { id, docId } = await params;
  const result = await archiveStudentDocument(id, docId);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
