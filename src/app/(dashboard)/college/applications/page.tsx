import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FileText } from "lucide-react";
import { ApplicationsTable } from "@/components/college/applications-table";

export const metadata: Metadata = { title: "Applications" };

export default async function CollegeApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; courseId?: string; page?: string }>;
}) {
  const user = await requireRole(["COLLEGE_ADMIN", "SUPER_ADMIN"]);
  const params = await searchParams;

  const college = await prisma.college.findFirst({
    where: { admin: { supabaseId: user.supabaseId } },
  });

  const page = Number(params.page ?? 1);
  const limit = 20;

  const where = {
    ...(college ? { collegeId: college.id } : {}),
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.courseId ? { courseId: params.courseId } : {}),
  };

  const [applications, total, courses, statusCounts] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        student: { select: { name: true, email: true, mobile: true } },
        course: { select: { name: true, degreeType: true } },
      },
    }),
    prisma.application.count({ where }),
    prisma.course.findMany({
      where: college ? { collegeId: college.id } : {},
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    college
      ? prisma.application.groupBy({
          by: ["status"],
          where: { collegeId: college.id },
          _count: { id: true },
        })
      : [],
  ]);

  return (
    <ApplicationsTable
      applications={applications}
      total={total}
      page={page}
      limit={limit}
      courses={courses}
      statusCounts={statusCounts}
      searchParams={params}
    />
  );
}
