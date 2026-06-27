"use client";

import Link from "next/link";
import { Users, DollarSign, TrendingUp, Clock, CheckCircle, Plus } from "lucide-react";
import { StatsCard } from "@/components/shared/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface Agency {
  id: string;
  name: string;
  isVerified: boolean;
}

interface AgencyDashboardProps {
  stats: {
    totalReferrals: number;
    activeStudents: number;
    convertedStudents: number;
    totalCommission: number;
    pendingCommission: number;
    paidCommission: number;
    agencyName: string;
  };
  agency: Agency | null;
}

export function AgencyDashboard({ stats, agency }: AgencyDashboardProps) {
  const conversionRate =
    stats.totalReferrals > 0
      ? ((stats.convertedStudents / stats.totalReferrals) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{stats.agencyName}</h1>
          <p className="text-muted-foreground mt-1">Referral and commission overview</p>
        </div>
        <Button asChild>
          <Link href="/agency/students/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Referral
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Referrals"
          value={stats.totalReferrals}
          icon={Users}
          description={`${stats.activeStudents} currently active`}
        />
        <StatsCard
          title="Conversions"
          value={stats.convertedStudents}
          icon={CheckCircle}
          description={`${conversionRate}% conversion rate`}
          iconClassName="text-green-600 bg-green-50"
        />
        <StatsCard
          title="Commission Earned"
          value={formatCurrency(stats.paidCommission)}
          icon={DollarSign}
          iconClassName="text-emerald-600 bg-emerald-50"
        />
        <StatsCard
          title="Pending Commission"
          value={formatCurrency(stats.pendingCommission)}
          icon={Clock}
          description="Awaiting approval"
          iconClassName="text-yellow-600 bg-yellow-50"
        />
      </div>

      {/* Commission Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Commission Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Total Earned", amount: stats.totalCommission, color: "text-foreground" },
                { label: "Paid", amount: stats.paidCommission, color: "text-green-600" },
                { label: "Pending Approval", amount: stats.pendingCommission, color: "text-yellow-600" },
                {
                  label: "Approved (not yet paid)",
                  amount: stats.totalCommission - stats.paidCommission - stats.pendingCommission,
                  color: "text-blue-600",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={`text-sm font-semibold ${item.color}`}>
                    {formatCurrency(Math.max(0, item.amount))}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Add Referral", href: "/agency/students/new", icon: Plus },
              { label: "View All Students", href: "/agency/students", icon: Users },
              { label: "Commission History", href: "/agency/commissions", icon: DollarSign },
              { label: "Payout History", href: "/agency/payouts", icon: CheckCircle },
              { label: "Manage Counselors", href: "/agency/counselors", icon: Users },
              { label: "Analytics", href: "/agency/analytics", icon: TrendingUp },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{action.label}</span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
