import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/universities/[id]/colleges
 * Returns all colleges linked to a university.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const university = await prisma.university.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!university) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const colleges = await prisma.college.findMany({
    where: { universityId: id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      city: true,
      country: true,
      status: true,
      logoUrl: true,
      officialEmail: true,
      _count: { select: { courses: true, applications: true } },
    },
  });

  return NextResponse.json({ university, colleges, total: colleges.length });
}
