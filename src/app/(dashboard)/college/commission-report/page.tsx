import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BarChart3, DollarSign, TrendingUp, BookOpen } from "lucide-react";
import { formatCommissionLabel, getCurrencySymbol } from "@/lib/commission-calculator";

export const metadata: Metadata = { title: "Commission Report" };

export default async function CollegeCommissionReportPage() {
  const user = await requireRole(["COLLEGE_ADMIN", "SUPER_ADMIN"]);

  const college = await prisma.college.findFirst({
    where: { admin: { supabaseId: user.supabaseId } },
  });

  if (!college) {
    return (
      <div className="p-6 text-center text-muted-foreground py-20">
        <BarChart3 className="w-12 h-12 opacity-20 mx-auto mb-4" />
        <p>College profile not set up yet.</p>
      </div>
    );
  }

  const courses = await prisma.course.findMany({
    where: { collegeId: college.id, commissionType: { not: null } },
    include: {
      applications: {
        select: {
          id: true,
          status: true,
          commission: { select: { commissionAmount: true, status: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  type Row = {
    id: string;
    name: string;
    degreeType: string;
    annualFee: number;
    currency: string;
    commissionLabel: string;
    totalApplications: number;
    totalAdmissions: number;
    commissionGenerated: number;
    commissionPaid: number;
    conversionRate: string;
  };

  const rows: Row[] = courses.map((c) => {
    const admissions = c.applications.filter((a) => a.status === "ENROLLED").length;
    const txns = c.applications.map((a) => a.commission).filter(Boolean);
    const generated = txns.reduce((s, t) => s + Number(t!.commissionAmount), 0);
    const paid = txns.filter((t) => t!.status === "PAID").reduce((s, t) => s + Number(t!.commissionAmount), 0);
    const rate = c.applications.length > 0
      ? `${((admissions / c.applications.length) * 100).toFixed(1)}%` : "—";

    return {
      id: c.id,
      name: c.name,
      degreeType: c.degreeType,
      annualFee: Number(c.annualFee ?? 0),
      currency: c.commissionCurrency,
      commissionLabel: formatCommissionLabel(
        { commissionType: c.commissionType as "FIXED" | "PERCENTAGE" | "SLAB", commissionValue: Number(c.commissionValue ?? 0), commissionRules: null },
        c.commissionCurrency,
        Number(c.annualFee ?? 0) || undefined
      ),
      totalApplications: c.applications.length,
      totalAdmissions: admissions,
      commissionGenerated: generated,
      commissionPaid: paid,
      conversionRate: rate,
    };
  });

  const totalGenerated = rows.reduce((s, r) => s + r.commissionGenerated, 0);
  const totalPaid = rows.reduce((s, r) => s + r.commissionPaid, 0);
  const totalApplications = rows.reduce((s, r) => s + r.totalApplications, 0);
  const totalAdmissions = rows.reduce((s, r) => s + r.totalAdmissions, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commission Report</h1>
        <p className="text-muted-foreground text-sm mt-1">Course-wise agency commission performance for {college.name}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Applications", value: totalApplications, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Admissions", value: totalAdmissions, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
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

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-20 text-muted-foreground">
          <DollarSign className="w-12 h-12 opacity-20 mb-4" />
          <p className="font-medium">No courses with commission configured</p>
          <p className="text-sm mt-1">Add commission settings to your courses to see this report</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Course</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Commission</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Applications</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Admissions</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Conversion</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Generated</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Paid</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => {
                  const sym = getCurrencySymbol(row.currency);
                  const pending = row.commissionGenerated - row.commissionPaid;
                  return (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.degreeType} · {sym}{row.annualFee.toLocaleString()}/yr</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{row.commissionLabel}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{row.totalApplications}</td>
                      <td className="px-4 py-3 text-center font-medium text-green-700">{row.totalAdmissions}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{row.conversionRate}</td>
                      <td className="px-4 py-3 text-right font-medium">{row.commissionGenerated > 0 ? `${sym}${row.commissionGenerated.toLocaleString()}` : "—"}</td>
                      <td className="px-4 py-3 text-right text-green-700">{row.commissionPaid > 0 ? `${sym}${row.commissionPaid.toLocaleString()}` : "—"}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{pending > 0 ? `${sym}${pending.toLocaleString()}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t bg-muted/30 font-semibold">
                <tr>
                  <td className="px-4 py-3" colSpan={2}>Totals</td>
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
