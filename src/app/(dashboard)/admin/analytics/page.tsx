import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BarChart3, TrendingUp, Users, DollarSign } from "lucide-react";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  await requireRole(["SUPER_ADMIN"]);

  const [totalLeads, totalStudents, totalApplications, totalRevenue] = await Promise.all([
    prisma.lead.count(),
    prisma.student.count(),
    prisma.application.count(),
    prisma.commissionTransaction.aggregate({
      _sum: { commissionAmount: true },
      where: { status: "PROCESSED" },
    }),
  ]);

  const leadsByStatus = await prisma.lead.groupBy({
    by: ["status"],
    _count: { status: true },
    orderBy: { _count: { status: "desc" } },
  });

  const cards = [
    { label: "Total Leads", value: totalLeads, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Students", value: totalStudents, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Applications", value: totalApplications, icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Revenue Processed", value: `₹${Number(totalRevenue._sum.commissionAmount ?? 0).toLocaleString("en-IN")}`, icon: DollarSign, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform-wide performance overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-4">Leads by Status</h2>
        <div className="space-y-3">
          {leadsByStatus.map((row) => {
            const pct = totalLeads > 0 ? Math.round((row._count.status / totalLeads) * 100) : 0;
            return (
              <div key={row.status}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{row.status.replace(/_/g, " ")}</span>
                  <span className="font-medium">{row._count.status} ({pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
