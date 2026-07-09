import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen, Plus, DollarSign } from "lucide-react";
import Link from "next/link";
import { formatCommissionLabel, getCurrencySymbol } from "@/lib/commission-calculator";

export const metadata: Metadata = { title: "Courses" };

export default async function CollegeCoursesPage() {
  const user = await requireRole(["COLLEGE_ADMIN", "SUPER_ADMIN"]);

  const college = await prisma.college.findFirst({
    where: { admin: { supabaseId: user.supabaseId } },
    include: {
      courses: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { applications: true } } },
      },
    },
  });

  const courses = college?.courses ?? [];

  const DEGREE_COLORS: Record<string, string> = {
    BACHELOR: "bg-blue-100 text-blue-700",
    MASTER: "bg-purple-100 text-purple-700",
    DOCTORATE: "bg-red-100 text-red-700",
    DIPLOMA: "bg-yellow-100 text-yellow-700",
    CERTIFICATE: "bg-green-100 text-green-700",
    OTHER: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-muted-foreground text-sm mt-1">{courses.length} courses offered</p>
        </div>
        {college && (
          <Link
            href="/college/courses/new"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />Add Course
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.length === 0 ? (
          <div className="col-span-2 text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No courses yet</p>
            <p className="text-sm mt-1">Add your first course to start receiving applications</p>
            {college && (
              <Link href="/college/courses/new" className="mt-4 inline-flex items-center gap-1 text-primary hover:underline text-sm">
                <Plus className="w-3 h-3" />Add Course
              </Link>
            )}
          </div>
        ) : (
          courses.map((course) => (
            <div key={course.id} className="rounded-lg border bg-card p-5 space-y-3 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-semibold">{course.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DEGREE_COLORS[course.degreeType] ?? ""}`}>
                      {course.degreeType}
                    </span>
                    <span className="text-xs text-muted-foreground">{course.duration}</span>
                  </div>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${course.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {course.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {course.eligibility && (
                <p className="text-xs text-muted-foreground line-clamp-2">{course.eligibility}</p>
              )}

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-muted/50 rounded p-2 text-center">
                  <p className="text-muted-foreground">Total Fee</p>
                  <p className="font-semibold text-sm">{getCurrencySymbol(course.commissionCurrency)}{Number(course.totalFee ?? 0).toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-muted/50 rounded p-2 text-center">
                  <p className="text-muted-foreground">Seats</p>
                  <p className="font-semibold text-sm">{course.totalSeats ?? "—"}</p>
                </div>
                <div className="bg-muted/50 rounded p-2 text-center">
                  <p className="text-muted-foreground">Applications</p>
                  <p className="font-semibold text-sm">{course._count.applications}</p>
                </div>
              </div>

              {/* Agency Commission Badge */}
              {course.commissionType && (
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800">
                  <DollarSign className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-medium">Agency Commission:</span>
                  <span>{formatCommissionLabel(
                    { commissionType: course.commissionType as "FIXED" | "PERCENTAGE" | "SLAB", commissionValue: Number(course.commissionValue ?? 0), commissionRules: course.commissionRules as import("@/lib/commission-calculator").SlabRule[] | null },
                    course.commissionCurrency,
                    Number(course.annualFee ?? 0) || undefined
                  )}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Link
                  href={`/college/courses/${course.id}/edit`}
                  className="flex-1 text-center text-xs bg-muted hover:bg-muted/80 py-1.5 rounded-md font-medium transition-colors"
                >
                  Edit
                </Link>
                <Link
                  href={`/college/applications?courseId=${course.id}`}
                  className="flex-1 text-center text-xs bg-primary/10 hover:bg-primary/20 text-primary py-1.5 rounded-md font-medium transition-colors"
                >
                  Applications
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
