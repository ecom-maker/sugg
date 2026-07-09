import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CourseForm } from "@/components/college/course-form";

export const metadata: Metadata = { title: "Edit Course" };

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["COLLEGE_ADMIN", "SUPER_ADMIN"]);
  const { id } = await params;

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) notFound();

  const courseData = {
    ...course,
    commissionType: course.commissionType as string | null,
    commissionValue: course.commissionValue,
    commissionCurrency: course.commissionCurrency,
    commissionRules: course.commissionRules,
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Course</h1>
        <p className="text-muted-foreground text-sm mt-1">{course.name}</p>
      </div>
      <CourseForm course={courseData} />
    </div>
  );
}
