import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BarChart3, TrendingUp, Users, CheckCircle, DollarSign } from "lucide-react";

export const metadata: Metadata = { title: "Branch Reports" };

export default async function BranchReportsPage() {
  const user = await requireRole(["BRANCH_MANAGER", "SUPER_ADMIN"]);

  const branch = await prisma.agencyBranch.findFirst({
    where: { manager: { supabaseId: user.supabaseId } },
  });

  if (!branch) {
    return <div className="p-6 text-muted-foreground">No branch assigned.</div>;
  }

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString("en-IN", { month: "short", year: "numeric" }) };
  }).reverse();

  const monthlyData = await Promise.all(
    months.map(async ({ year, month, label }) => {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      const [leads, admissions, commissions] = await Promise.all([
        prisma.lead.count({ where: { branchId: branch.id, createdAt: { gte: start, lte: end } } }),
        prisma.application.count({ where: { branchId: branch.id, status: "ENROLLED", enrolledAt: { gte: start, lte: end } } }),
        prisma.commissionTransaction.aggregate({ where: { branchId: branch.id, createdAt: { gte: start, lte: end } }, _sum: { commissionAmount: true } }),
      ]);
      return { label, leads, admissions, commission: Number(commissions._sum.commissionAmount ?? 0) };
    })
  );

  // Counselor performance
  const counselorPerf = await prisma.agencyUser.findMany({
    where: { branchId: branch.id },
    include: {
      user: {
        select: {
          fullName: true,
          assignedLeads: { select: { id: true, status: true } },
        },
      },
    },
  });

  const counselorStats = counselorPerf.map(({ user: u }) => ({
    name: u.fullName,
    totalLeads: u.assignedLeads.length,
    converted: u.assignedLeads.filter(l => l.status === "ADMISSION_CONFIRMED").length,
    conversionRate: u.assignedLeads.length > 0
      ? Math.round((u.assignedLeads.filter(l => l.status === "ADMISSION_CONFIRMED").length / u.assignedLeads.length) * 100)
      : 0,
  })).sort((a, b) => b.converted - a.converted);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Branch Performance Report</h1>
        <p className="text-muted-foreground text-sm mt-1">{branch.branchName} — Last 6 months</p>
      </div>

      {/* Monthly trend */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold mb-4">Monthly Overview</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Month</th>
                <th className="text-right px-3 py-2 font-medium">Leads</th>
                <th className="text-right px-3 py-2 font-medium">Admissions</th>
                <th className="text-right px-3 py-2 font-medium">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {monthlyData.map((row) => (
                <tr key={row.label} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{row.label}</td>
                  <td className="px-3 py-2 text-right">{row.leads}</td>
                  <td className="px-3 py-2 text-right font-semibold">{row.admissions}</td>
                  <td className="px-3 py-2 text-right text-emerald-700 font-semibold">₹{row.commission.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Counselor Performance */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold mb-4">Counselor Performance</h2>
        <div className="space-y-3">
          {counselorStats.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No counselor data</p>
          ) : (
            counselorStats.map((c, i) => (
              <div key={c.name} className="flex items-center gap-4">
                <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium truncate">{c.name}</span>
                    <span className="text-muted-foreground shrink-0">{c.converted}/{c.totalLeads} · {c.conversionRate}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${c.conversionRate}%` }} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
