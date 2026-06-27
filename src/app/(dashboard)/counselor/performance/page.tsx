import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BarChart3, Users, CheckCircle, Calendar } from "lucide-react";

export const metadata: Metadata = { title: "Performance" };

export default async function PerformancePage() {
  const user = await requireRole(["SUGG_COUNSELOR", "SUPER_ADMIN"]);

  const [totalLeads, convertedLeads, pendingFollowups, callsThisMonth] = await Promise.all([
    prisma.lead.count({ where: { assignedCounselor: { supabaseId: user.supabaseId } } }),
    prisma.lead.count({ where: { assignedCounselor: { supabaseId: user.supabaseId }, status: "ADMISSION_CONFIRMED" } }),
    prisma.leadFollowup.count({ where: { lead: { assignedCounselor: { supabaseId: user.supabaseId } }, isCompleted: false } }),
    prisma.callLog.count({
      where: {
        counselor: { supabaseId: user.supabaseId },
        calledAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ]);

  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  const cards = [
    { label: "Total Leads", value: totalLeads, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Conversions", value: convertedLeads, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    { label: "Pending Follow-ups", value: pendingFollowups, icon: Calendar, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Calls This Month", value: callsThisMonth, icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Performance</h1>
        <p className="text-muted-foreground text-sm mt-1">Conversion rate: {conversionRate}%</p>
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
        <h2 className="font-semibold mb-3">Conversion Rate</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${conversionRate}%` }} />
          </div>
          <span className="text-lg font-bold w-12 text-right">{conversionRate}%</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{convertedLeads} confirmed out of {totalLeads} total leads</p>
      </div>
    </div>
  );
}
