import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CourseForm } from "@/components/college/course-form";

export const metadata: Metadata = { title: "Edit Course" };

export default async function AdminCourseEditPage({
  params,
}: {
  params: Promise<{ id: string; courseId: string }>;
}) {
  await requireRole(["SUPER_ADMIN"]);
  const { id, courseId } = await params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, collegeId: id },
    select: {
      id: true, name: true, degreeType: true, duration: true, durationMonths: true,
      eligibility: true, totalSeats: true, availableSeats: true, annualFee: true,
      totalFee: true, description: true, isActive: true, commissionType: true,
      commissionValue: true, commissionCurrency: true, commissionRules: true,
    },
  });
  if (!course) notFound();

  const college = await prisma.college.findUnique({ where: { id }, select: { name: true } });

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <Link
        href={`/admin/colleges/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back to college
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Edit Course</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {college?.name ? `${college.name} — ` : ""}update fees, duration, seats and agency commission.
        </p>
      </div>
      <CourseForm course={course} redirectTo={`/admin/colleges/${id}`} />
    </div>
  );
}
