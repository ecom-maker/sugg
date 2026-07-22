import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen, DollarSign, Search } from "lucide-react";
import {
  calculateCourseCommission,
  formatCommissionLabel,
  getCurrencySymbol,
  parseSlabRules,
} from "@/lib/commission-calculator";

export const metadata: Metadata = { title: "Available Courses & Commissions" };

export default async function AgencyCoursesPage() {
  const user = await requireRole([
    "AGENCY_OWNER",
    "AGENCY_ADMIN",
    "BRANCH_MANAGER",
    "AGENCY_COUNSELOR",
    "SUPER_ADMIN",
  ]);
  // Counsellors and branch managers see course + fee details only; commission
  // is visible to agency owner/admin (and Super Admin) only.
  const showCommission = user.role !== "AGENCY_COUNSELOR" && user.role !== "BRANCH_MANAGER";

  // Fetch all active courses that have a commission configured
  const courses = await prisma.course.findMany({
    where: {
      isActive: true,
      commissionType: { not: null },
    },
    include: {
      college: { select: { id: true, name: true, city: true, country: true, logoUrl: true } },
      _count: { select: { applications: true } },
    },
    orderBy: [{ college: { name: "asc" } }, { name: "asc" }],
  });

  const DEGREE_COLORS: Record<string, string> = {
    BACHELOR: "bg-blue-100 text-blue-700",
    MASTER:   "bg-purple-100 text-purple-700",
    DOCTORATE:"bg-red-100 text-red-700",
    DIPLOMA:  "bg-yellow-100 text-yellow-700",
    CERTIFICATE:"bg-green-100 text-green-700",
    OTHER:    "bg-gray-100 text-gray-600",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{showCommission ? "Available Course Commissions" : "Available Courses"}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {showCommission ? `${courses.length} courses offering agency commission` : `${courses.length} courses available`}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg text-sm text-muted-foreground">
          <Search className="w-4 h-4" />
          <span>Browse all referral opportunities</span>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-20 text-muted-foreground">
          <BookOpen className="w-12 h-12 opacity-20 mb-4" />
          <p className="font-medium text-lg">No courses with commission yet</p>
          <p className="text-sm mt-1">Colleges will configure commissions when they add courses</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((course) => {
            const sym = getCurrencySymbol(course.commissionCurrency);
            const annualFee = Number(course.annualFee ?? 0);
            const config = {
              commissionType: course.commissionType as "FIXED" | "PERCENTAGE" | "SLAB",
              commissionValue: Number(course.commissionValue ?? 0),
              commissionRules: parseSlabRules(course.commissionRules),
            };
            const result = calculateCourseCommission(config, annualFee, course.commissionCurrency);
            const label = formatCommissionLabel(config, course.commissionCurrency, annualFee);

            return (
              <div key={course.id} className="rounded-xl border bg-card hover:shadow-md transition-shadow flex flex-col">
                {/* College header */}
                <div className="px-4 pt-4 pb-2 flex items-center gap-3 border-b">
                  {course.college.logoUrl ? (
                    <img src={course.college.logoUrl} alt="" className="w-8 h-8 rounded object-contain" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {course.college.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{course.college.name}</p>
                    {course.college.city && (
                      <p className="text-xs text-muted-foreground">{course.college.city}{course.college.country ? `, ${course.college.country}` : ""}</p>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{course.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DEGREE_COLORS[course.degreeType] ?? ""}`}>
                          {course.degreeType}
                        </span>
                        <span className="text-xs text-muted-foreground">{course.duration}</span>
                      </div>
                    </div>
                  </div>

                  {course.eligibility && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{course.eligibility}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <p className="text-muted-foreground">Annual Fee</p>
                      <p className="font-semibold text-sm">{sym}{annualFee.toLocaleString()}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <p className="text-muted-foreground">Seats</p>
                      <p className="font-semibold text-sm">{course.availableSeats ?? course.totalSeats ?? "—"}</p>
                    </div>
                  </div>

                  {/* Commission Highlight — hidden for counsellors */}
                  {showCommission && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Agency Commission</span>
                      </div>
                      {result && result.commissionAmount > 0 ? (
                        <>
                          <p className="text-2xl font-bold text-emerald-700">
                            {sym}{result.commissionAmount.toLocaleString()}
                          </p>
                          <p className="text-xs text-emerald-600 mt-0.5">{label}</p>
                        </>
                      ) : (
                        <p className="text-sm text-emerald-700">{label}</p>
                      )}
                    </div>
                  )}
                </div>

                {showCommission && (
                  <div className="px-4 pb-4">
                    <a
                      href={`/api/courses/${course.id}/commission-preview`}
                      target="_blank"
                      className="block w-full text-center text-xs bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-lg font-medium transition-colors"
                    >
                      View Commission Details
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
