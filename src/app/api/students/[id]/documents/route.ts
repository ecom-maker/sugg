import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { requireStudentAccess } from "@/lib/student-scope";
import { prisma } from "@/lib/prisma";
import { getSignedDocumentUrl } from "@/lib/student-storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await requireStudentAccess(user, id, "read");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: 403 });

  const docs = await prisma.studentDocument.findMany({
    where: { studentId: id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { fullName: true } }, verifiedBy: { select: { fullName: true } } },
  });

  return NextResponse.json({ documents: docs });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { uploadStudentDocumentAction } = await import("@/actions/student-profile");
  const { id } = await params;
  const formData = await request.formData();
  const result = await uploadStudentDocumentAction(id, formData);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
