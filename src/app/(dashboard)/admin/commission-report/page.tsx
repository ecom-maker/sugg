import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BarChart3, DollarSign, TrendingUp, BookOpen } from "lucide-react";
import { getCurrencySymbol } from "@/lib/commission-calculator";

export const metadata: Metadata = { title: "Course-wise Commission Report" };

export default async function CourseCommissionReportPage() {
  await requireRole(["SUPER_ADMIN"]);

  // Aggregate per course: applications, admissions, commission generated/paid
  const courses = await prisma.course.findMany({
    where: { commissionType: { not: null } },
    include: {
      college: { select: { id: true, name: true } },
      applications: {
        select: {
          id: true,
          status: true,
          commission: { select: { commissionAmount: true, status: true } },
        },
      },
    },
    orderBy: [{ college: { name: "asc" } }, { name: "asc" }],
  });

  type CourseRow = {
    courseId: string;
    courseName: string;
    collegeName: string;
    degreeType: string;
    annualFee: number;
    commissionType: string;
    commissionValue: number;
    currency: string;
    totalApplications: number;
    totalAdmissions: number;
    commissionGenerated: number;
    commissionPaid: number;
    conversionRate: string;
  };

  const rows: CourseRow[] = courses.map((c) => {
    const admissions = c.applications.filter((a) => a.status === "ENROLLED").length;
    const txns = c.applications.map((a) => a.commission).filter(Boolean);
    const generated = txns.reduce((s, t) => s + Number(t!.commissionAmount), 0);
    const paid = txns.filter((t) => t!.status === "PAID").reduce((s, t) => s + Number(t!.commissionAmount), 0);
    const rate = c.applications.length > 0
      ? `${((admissions / c.applications.length) * 100).toFixed(1)}%` : "—";

    return {
      courseId: c.id,
      courseName: c.name,
      collegeName: c.college.name,
      degreeType: c.degreeType,
      annualFee: Number(c.annualFee ?? 0),
      commissionType: c.commissionType as string,
      commissionValue: Number(c.commissionValue ?? 0),
      currency: c.commissionCurrency,
      totalApplications: c.applications.length,
      totalAdmissions: admissions,
      commissionGenerated: generated,
      commissionPaid: paid,
      conversionRate: rate,
    };
  });

  // Summary totals
  const totalApplications = rows.reduce((s, r) => s + r.totalApplications, 0);
  const totalAdmissions = rows.reduce((s, r) => s + r.totalAdmissions, 0);
  const totalGenerated = rows.reduce((s, r) => s + r.commissionGenerated, 0);
  const totalPaid = rows.reduce((s, r) => s + r.commissionPaid, 0);

  const COMMISSION_TYPE_LABELS: Record<string, string> = {
    FIXED: "Fixed",
    PERCENTAGE: "Percentage",
    SLAB: "Slab",
  };

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
      <div>
        <h1 className="text-2xl font-bold">Course-wise Commission Report</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Performance overview for all courses with configured agency commissions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Applications", value: totalApplications.toLocaleString(), icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Admissions (Enrolled)", value: totalAdmissions.toLocaleString(), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
          { label: "Commission Generated", value: `₹${totalGenerated.toLocaleString("en-IN")}`, icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Commission Paid", value: `₹${totalPaid.toLocaleString("en-IN")}`, icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border bg-card p-4">
            <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-20 text-muted-foreground">
          <BarChart3 className="w-12 h-12 opacity-20 mb-4" />
          <p className="font-medium">No courses with commission configured</p>
          <p className="text-sm mt-1">College admins must configure commissions on their courses</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Course</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">College</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground whitespace-nowrap">Commission Config</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground whitespace-nowrap">Applications</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground whitespace-nowrap">Admissions</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground whitespace-nowrap">Conversion</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Generated</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Paid</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => {
                  const sym = getCurrencySymbol(row.currency);
                  const pending = row.commissionGenerated - row.commissionPaid;
                  return (
                    <tr key={row.courseId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.courseName}</p>
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-0.5 ${DEGREE_COLORS[row.degreeType] ?? ""}`}>
                          {row.degreeType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.collegeName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          {COMMISSION_TYPE_LABELS[row.commissionType]}
                          {row.commissionType === "PERCENTAGE" && ` — ${row.commissionValue}%`}
                          {row.commissionType === "FIXED" && ` — ${sym}${row.commissionValue.toLocaleString()}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{row.totalApplications}</td>
                      <td className="px-4 py-3 text-center font-medium text-green-700">{row.totalAdmissions}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{row.conversionRate}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {row.commissionGenerated > 0 ? `${sym}${row.commissionGenerated.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-700">
                        {row.commissionPaid > 0 ? `${sym}${row.commissionPaid.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-amber-600">
                        {pending > 0 ? `${sym}${pending.toLocaleString("en-IN")}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t bg-muted/30 font-semibold">
                <tr>
                  <td className="px-4 py-3" colSpan={3}>Totals ({rows.length} courses)</td>
                  <td className="px-4 py-3 text-center">{totalApplications}</td>
                  <td className="px-4 py-3 text-center text-green-700">{totalAdmissions}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {totalApplications > 0 ? `${((totalAdmissions / totalApplications) * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">₹{totalGenerated.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right text-green-700">₹{totalPaid.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right text-amber-600">₹{(totalGenerated - totalPaid).toLocaleString("en-IN")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
