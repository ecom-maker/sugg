import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Building2, Users, TrendingUp, DollarSign, Trophy, BarChart3 } from "lucide-react";
import Link from "next/link";
import { OnboardingChecklist } from "@/components/agency/onboarding-checklist";

export const metadata: Metadata = { title: "Agency Owner Dashboard" };

export default async function AgencyOwnerDashboard() {
  const user = await requireRole(["AGENCY_OWNER", "SUPER_ADMIN"]);

  const agency = await prisma.agency.findFirst({
    where: { owner: { supabaseId: user.supabaseId } },
    include: {
      branches: {
        include: {
          _count: { select: { agencyUsers: true, students: true, leads: true, applications: true } },
          commissions: { select: { commissionAmount: true, status: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { branches: true, agencyUsers: true } },
    },
  });

  const branches = agency?.branches ?? [];
  const totalStudents = branches.reduce((s, b) => s + b._count.students, 0);
  const totalLeads = branches.reduce((s, b) => s + b._count.leads, 0);
  const totalAdmissions = await prisma.application.count({
    where: { branch: { agencyId: agency?.id ?? "" }, status: "ENROLLED" },
  });
  const totalCommission = branches.reduce((s, b) =>
    s + b.commissions.reduce((cs, c) => cs + Number(c.commissionAmount), 0), 0
  );

  // Top performing branch by admissions
  const branchStats = await Promise.all(
    branches.map(async (b) => ({
      branch: b,
      admissions: await prisma.application.count({ where: { branchId: b.id, status: "ENROLLED" } }),
      revenue: b.commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + Number(c.commissionAmount), 0),
    }))
  );
  branchStats.sort((a, b) => b.admissions - a.admissions);
  const topBranch = branchStats[0];

  const statCards = [
    { label: "Total Branches", value: agency?._count.branches ?? 0, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Staff", value: agency?._count.agencyUsers ?? 0, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Students", value: totalStudents, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Total Admissions", value: totalAdmissions, icon: Trophy, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Total Leads", value: totalLeads, icon: BarChart3, color: "text-cyan-600", bg: "bg-cyan-50" },
    { label: "Total Commission", value: `₹${totalCommission.toLocaleString("en-IN")}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{agency?.name ?? "Agency"} — Owner Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Full agency overview</p>
        </div>
        <Link href="/agency/branches/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Building2 className="w-4 h-4" />New Branch
        </Link>
      </div>

      <OnboardingChecklist />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-lg border bg-card p-4">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Top Branch */}
      {topBranch && (
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="font-semibold">Top Performing Branch</span>
          </div>
          <p className="text-xl font-bold">{topBranch.branch.branchName}</p>
          <p className="text-sm text-muted-foreground">{topBranch.admissions} admissions · ₹{topBranch.revenue.toLocaleString("en-IN")} revenue</p>
        </div>
      )}

      {/* Branch Comparison */}
      <div>
        <h2 className="font-semibold mb-4">Branch Comparison</h2>
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Branch</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Staff</th>
                <th className="text-right px-4 py-3 font-medium">Students</th>
                <th className="text-right px-4 py-3 font-medium">Leads</th>
                <th className="text-right px-4 py-3 font-medium">Admissions</th>
                <th className="text-right px-4 py-3 font-medium">Revenue</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {branchStats.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">
                  No branches yet. <Link href="/agency/branches/new" className="text-primary hover:underline">Create your first branch</Link>
                </td></tr>
              ) : (
                branchStats.map(({ branch, admissions, revenue }) => (
                  <tr key={branch.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{branch.branchName}</p>
                      <p className="text-xs text-muted-foreground">{branch.branchCode}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${branch.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {branch.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{branch._count.agencyUsers}</td>
                    <td className="px-4 py-3 text-right">{branch._count.students}</td>
                    <td className="px-4 py-3 text-right">{branch._count.leads}</td>
                    <td className="px-4 py-3 text-right font-semibold">{admissions}</td>
                    <td className="px-4 py-3 text-right font-semibold">₹{revenue.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <Link href={`/agency/branches/${branch.id}`} className="text-xs text-primary hover:underline">View</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
