import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users, TrendingUp, DollarSign, Calendar, CheckCircle, BarChart3, ClipboardList } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Branch Dashboard" };

export default async function BranchManagerDashboard() {
  const user = await requireRole(["BRANCH_MANAGER", "SUPER_ADMIN"]);

  const branch = await prisma.agencyBranch.findFirst({
    where: { manager: { supabaseId: user.supabaseId } },
    include: {
      agency: { select: { name: true } },
      _count: { select: { agencyUsers: true, students: true, leads: true, applications: true } },
    },
  });

  if (!branch) {
    return (
      <div className="p-6 text-center py-16 text-muted-foreground">
        <p className="font-medium">No branch assigned to you yet.</p>
        <p className="text-sm mt-1">Contact your Agency Admin.</p>
      </div>
    );
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    admissionsTotal,
    admissionsThisMonth,
    pendingFollowups,
    tasksDueToday,
    conversionLeads,
    commissionTotal,
    recentLeads,
  ] = await Promise.all([
    prisma.application.count({ where: { branchId: branch.id, status: "ENROLLED" } }),
    prisma.application.count({ where: { branchId: branch.id, status: "ENROLLED", enrolledAt: { gte: startOfMonth } } }),
    prisma.leadFollowup.count({ where: { lead: { branchId: branch.id }, status: { not: "COMPLETED" } } }),
    prisma.task.count({ where: {
      assignee: { managedBranch: { id: branch.id } },
      status: { not: "COMPLETED" },
      dueAt: { gte: new Date(now.setHours(0, 0, 0, 0)), lte: new Date(now.setHours(23, 59, 59, 999)) },
    }}),
    prisma.lead.count({ where: { branchId: branch.id, status: "ADMISSION_CONFIRMED" } }),
    prisma.commissionTransaction.aggregate({ where: { branchId: branch.id }, _sum: { commissionAmount: true } }),
    prisma.lead.findMany({
      where: { branchId: branch.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { student: { select: { name: true } }, assignedTo: { select: { fullName: true } } },
    }),
  ]);

  const conversionRate = branch._count.leads > 0
    ? Math.round((conversionLeads / branch._count.leads) * 100)
    : 0;

  const STATUS_COLORS: Record<string, string> = {
    NEW: "bg-blue-100 text-blue-700",
    CONTACTED: "bg-yellow-100 text-yellow-700",
    QUALIFIED: "bg-purple-100 text-purple-700",
    ADMISSION_CONFIRMED: "bg-green-100 text-green-700",
    LOST: "bg-red-100 text-red-700",
  };

  const statCards = [
    { label: "Branch Leads", value: branch._count.leads, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", href: "/branch/leads" },
    { label: "Active Counselors", value: branch._count.agencyUsers, icon: Users, color: "text-purple-600", bg: "bg-purple-50", href: "/branch/counselors" },
    { label: "Total Students", value: branch._count.students, icon: Users, color: "text-green-600", bg: "bg-green-50", href: "/branch/students" },
    { label: "Admissions (Total)", value: admissionsTotal, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", href: "/branch/applications" },
    { label: "This Month", value: admissionsThisMonth, icon: BarChart3, color: "text-orange-600", bg: "bg-orange-50", href: "/branch/applications" },
    { label: "Pending Follow-ups", value: pendingFollowups, icon: Calendar, color: "text-yellow-600", bg: "bg-yellow-50", href: "/branch/followups" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: BarChart3, color: "text-cyan-600", bg: "bg-cyan-50", href: "/branch/reports" },
    { label: "Tasks Due Today", value: tasksDueToday, icon: ClipboardList, color: "text-red-600", bg: "bg-red-50", href: "/branch/tasks" },
    { label: "Commission Total", value: `₹${Number(commissionTotal._sum.commissionAmount ?? 0).toLocaleString("en-IN")}`, icon: DollarSign, color: "text-teal-600", bg: "bg-teal-50", href: "/branch/commissions" },
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{branch.branchName}</h1>
        <p className="text-muted-foreground text-sm mt-1">{branch.agency.name} · Branch Manager Dashboard</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Recent Leads */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent Leads</h2>
          <Link href="/branch/leads" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Student</th>
                <th className="text-left px-4 py-3 font-medium">Assigned To</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentLeads.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No leads yet</td></tr>
              ) : (
                recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{lead.student.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.assignedTo?.fullName ?? "Unassigned"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {lead.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString("en-IN")}</td>
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
