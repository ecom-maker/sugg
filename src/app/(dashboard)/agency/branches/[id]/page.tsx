import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Building2, Users, TrendingUp, DollarSign, MapPin, Phone, Mail, UserCheck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Branch Details" };

export default async function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["AGENCY_OWNER", "AGENCY_ADMIN", "SUPER_ADMIN"]);
  const { id } = await params;

  const branch = await prisma.agencyBranch.findUnique({
    where: { id },
    include: {
      agency: { select: { name: true } },
      manager: { select: { fullName: true, email: true } },
      agencyUsers: {
        include: { user: { select: { id: true, fullName: true, email: true, role: true, isActive: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { students: true, leads: true, applications: true, commissions: true } },
    },
  });

  if (!branch) notFound();

  const [admissions, totalCommission, pendingFollowups] = await Promise.all([
    prisma.application.count({ where: { branchId: id, status: "ENROLLED" } }),
    prisma.commissionTransaction.aggregate({
      where: { branchId: id },
      _sum: { commissionAmount: true },
    }),
    prisma.leadFollowup.count({ where: { lead: { branchId: id }, status: { not: "COMPLETED" } } }),
  ]);

  const conversionRate = branch._count.leads > 0
    ? Math.round((admissions / branch._count.leads) * 100)
    : 0;

  const statCards = [
    { label: "Students", value: branch._count.students, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Leads", value: branch._count.leads, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Admissions", value: admissions, icon: UserCheck, color: "text-green-600", bg: "bg-green-50" },
    { label: "Pending Follow-ups", value: pendingFollowups, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: BarChart3Icon, color: "text-cyan-600", bg: "bg-cyan-50" },
    { label: "Total Commission", value: `₹${Number(totalCommission._sum.commissionAmount ?? 0).toLocaleString("en-IN")}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{branch.branchName}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${branch.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {branch.status}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">{branch.agency.name} · {branch.branchCode}</p>
          </div>
        </div>
        <Link href={`/agency/branches/${id}/edit`} className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors">
          Edit Branch
        </Link>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">Branch Info</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            {(branch.city ?? branch.state) && (
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{[branch.city, branch.state, branch.country].filter(Boolean).join(", ")}</div>
            )}
            {branch.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" />{branch.phone}</div>}
            {branch.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4" />{branch.email}</div>}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">Branch Manager</h3>
          {branch.manager ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center font-semibold text-blue-600 text-sm">
                {branch.manager.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="font-medium text-sm">{branch.manager.fullName}</p>
                <p className="text-xs text-muted-foreground">{branch.manager.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No manager assigned</p>
          )}
        </div>
      </div>

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

      {/* Staff */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Branch Staff ({branch.agencyUsers.length})</h2>
        </div>
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {branch.agencyUsers.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No staff in this branch</td></tr>
              ) : (
                branch.agencyUsers.map(({ user: u }) => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{u.fullName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.role.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
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

function BarChart3Icon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M3 3v18h18M9 17V9m4 8V5m4 12v-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
