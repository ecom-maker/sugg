import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Building2, Users, TrendingUp, DollarSign } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Agency Admin Dashboard" };

export default async function AgencyAdminDashboard() {
  const user = await requireRole(["AGENCY_ADMIN", "AGENCY_OWNER", "SUPER_ADMIN"]);

  const agency = await prisma.agency.findFirst({
    where: {
      OR: [
        { owner: { supabaseId: user.supabaseId } },
        { agencyUsers: { some: { user: { supabaseId: user.supabaseId } } } },
      ],
    },
    include: {
      branches: {
        include: {
          _count: { select: { agencyUsers: true, students: true, leads: true } },
          manager: { select: { fullName: true } },
        },
        orderBy: { branchName: "asc" },
      },
    },
  });

  const branches = agency?.branches ?? [];
  const totalCounselors = branches.reduce((s, b) => s + b._count.agencyUsers, 0);
  const totalStudents = branches.reduce((s, b) => s + b._count.students, 0);
  const pendingAdmissions = await prisma.application.count({
    where: { branch: { agencyId: agency?.id ?? "" }, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
  });
  const commissionTotal = await prisma.commissionTransaction.aggregate({
    where: { agency: { id: agency?.id ?? "" } },
    _sum: { commissionAmount: true },
  });

  const cards = [
    { label: "Active Branches", value: branches.filter(b => b.status === "ACTIVE").length, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Counselors", value: totalCounselors, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Students", value: totalStudents, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Pending Admissions", value: pendingAdmissions, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Commission Total", value: `₹${Number(commissionTotal._sum.commissionAmount ?? 0).toLocaleString("en-IN")}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agency Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">{agency?.name}</p>
        </div>
        <Link href="/agency/branches/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Building2 className="w-4 h-4" />New Branch
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
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

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Branch Performance</h2>
          <Link href="/agency/branches" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-muted-foreground border rounded-lg">
              No branches yet. <Link href="/agency/branches/new" className="text-primary hover:underline">Create one</Link>
            </div>
          ) : (
            branches.map((branch) => (
              <div key={branch.id} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{branch.branchName}</p>
                    <p className="text-xs text-muted-foreground">{branch.branchCode} · {branch.city ?? "—"}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${branch.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {branch.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center bg-muted/50 rounded p-2">
                    <p className="text-xs text-muted-foreground">Staff</p>
                    <p className="font-bold">{branch._count.agencyUsers}</p>
                  </div>
                  <div className="text-center bg-muted/50 rounded p-2">
                    <p className="text-xs text-muted-foreground">Students</p>
                    <p className="font-bold">{branch._count.students}</p>
                  </div>
                  <div className="text-center bg-muted/50 rounded p-2">
                    <p className="text-xs text-muted-foreground">Leads</p>
                    <p className="font-bold">{branch._count.leads}</p>
                  </div>
                </div>
                {branch.manager && (
                  <p className="text-xs text-muted-foreground">Manager: {branch.manager.fullName}</p>
                )}
                <Link href={`/agency/branches/${branch.id}`} className="text-xs text-primary hover:underline">View branch →</Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
