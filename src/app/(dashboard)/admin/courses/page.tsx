import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = { title: "Courses" };

export default async function AdminCoursesPage() {
  await requireRole(["SUPER_ADMIN"]);

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      college: { select: { name: true } },
      _count: { select: { leads: true, applications: true } },
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Courses</h1>
        <p className="text-muted-foreground text-sm mt-1">{courses.length} courses across all colleges</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground border rounded-lg">
            No courses yet. Add courses from the Colleges section.
          </div>
        ) : (
          courses.map((course) => (
            <div key={course.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{course.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{course.college.name}</p>
                </div>
                <span className={`ml-auto shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${course.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {course.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex justify-between"><span>Duration</span><span className="text-foreground">{course.durationMonths ?? "—"} months</span></div>
                <div className="flex justify-between"><span>Fee</span><span className="text-foreground">₹{Number(course.tuitionFee ?? 0).toLocaleString("en-IN")}</span></div>
              </div>
              <div className="pt-2 border-t flex justify-between text-xs text-muted-foreground">
                <span>{course._count.leads} leads</span>
                <span>{course._count.applications} applications</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
