import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = { title: "My Courses" };

export default async function CollegeCoursesPage() {
  const user = await requireRole(["COLLEGE_ADMIN"]);

  const college = await prisma.college.findFirst({
    where: { users: { some: { supabaseId: user.supabaseId } } },
    include: {
      courses: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { applications: true } } },
      },
    },
  });

  const courses = college?.courses ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Courses</h1>
        <p className="text-muted-foreground text-sm mt-1">{courses.length} courses offered</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.length === 0 ? (
          <div className="col-span-2 text-center py-16 text-muted-foreground border rounded-lg">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No courses added yet
          </div>
        ) : (
          courses.map((course) => (
            <div key={course.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{course.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{course.degree ?? ""} · {course.durationMonths ?? "?"} months</p>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${course.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {course.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-xs text-muted-foreground">Tuition Fee</p>
                  <p className="font-semibold">₹{Number(course.tuitionFee ?? 0).toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-xs text-muted-foreground">Applications</p>
                  <p className="font-semibold">{course._count.applications}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
