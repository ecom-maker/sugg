import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { requireStudentAccess } from "@/lib/student-scope";
import { prisma } from "@/lib/prisma";
import { createEducationHistory } from "@/actions/student-profile";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await requireStudentAccess(user, id, "read");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: 403 });

  const [education, testScores] = await Promise.all([
    prisma.studentEducationHistory.findMany({
      where: { studentId: id, status: "ACTIVE" },
      orderBy: { yearOfCompletion: "desc" },
      include: { country: { select: { countryName: true } } },
    }),
    prisma.studentTestScore.findMany({
      where: { studentId: id },
      orderBy: { testDate: "desc" },
      include: { document: { select: { id: true, documentName: true } } },
    }),
  ]);

  return NextResponse.json({ education, testScores });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await request.formData();
  const result = await createEducationHistory(id, formData);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
