import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || !["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const courseId = searchParams.get("courseId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const college = await prisma.college.findFirst({
    where: { admin: { supabaseId: user.supabaseId } },
  });
  if (!college) return NextResponse.json({ error: "College not found" }, { status: 404 });

  const where = {
    collegeId: college.id,
    ...(status ? { status: status as never } : {}),
    ...(courseId ? { courseId } : {}),
  };

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { name: true, email: true, mobile: true } },
        course: { select: { name: true } },
        statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.application.count({ where }),
  ]);

  return NextResponse.json({ applications, total, page, limit });
}
