import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/course-catalog?q=&field=&degreeType=
 * Master catalog of India courses, used to populate the college Add Course
 * picker. Available to any authenticated user.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const field = searchParams.get("field") ?? "";
  const degreeType = searchParams.get("degreeType") ?? "";

  const where: Record<string, unknown> = { isActive: true };
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (field) where.field = field;
  if (degreeType) where.degreeType = degreeType;

  const courses = await prisma.courseCatalog.findMany({
    where: where as never,
    orderBy: { name: "asc" },
    take: 50,
    select: { id: true, name: true, degreeType: true, field: true, duration: true },
  });

  return NextResponse.json({ courses });
}
