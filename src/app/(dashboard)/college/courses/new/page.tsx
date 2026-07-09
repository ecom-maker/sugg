import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { CourseForm } from "@/components/college/course-form";

export const metadata: Metadata = { title: "Add Course" };

export default async function NewCoursePage() {
  await requireRole(["COLLEGE_ADMIN", "SUPER_ADMIN"]);
  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add New Course</h1>
        <p className="text-muted-foreground text-sm mt-1">Define a course to receive student applications</p>
      </div>
      <CourseForm />
    </div>
  );
}
