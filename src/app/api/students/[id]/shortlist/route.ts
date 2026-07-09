import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { requireStudentAccess } from "@/lib/student-scope";
import { addToShortlist, removeFromShortlist } from "@/actions/student-profile";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await requireStudentAccess(user, id, "read");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: 403 });

  const shortlists = await prisma.studentShortlist.findMany({
    where: { studentId: id },
    include: {
      course: {
        select: {
          id: true, name: true, degreeType: true, eligibility: true,
          annualFee: true, commissionType: true, commissionValue: true, commissionCurrency: true,
        },
      },
      college: { select: { id: true, name: true } },
      shortlistedBy: { select: { fullName: true } },
    },
    orderBy: { priority: "asc" },
  });

  return NextResponse.json({ shortlists });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = await addToShortlist(id, body.courseId, body.notes);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error, warn: result.warn }, { status: 400 });
  }
  return NextResponse.json(result);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entryId = request.nextUrl.searchParams.get("entryId");
  if (!entryId) return NextResponse.json({ error: "entryId required" }, { status: 400 });

  const result = await removeFromShortlist(id, entryId);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
