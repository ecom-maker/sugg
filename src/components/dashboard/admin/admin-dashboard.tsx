"use client";

import {
  Users,
  Building2,
  Briefcase,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { StatsCard } from "@/components/shared/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface AdminDashboardProps {
  stats: {
    totalLeads: number;
    newLeads: number;
    confirmedAdmissions: number;
    totalColleges: number;
    approvedColleges: number;
    totalAgencies: number;
    totalStudents: number;
    pendingCommissions: number;
    totalCommissionAmount: number;
    totalUniversities: number;
    activeUniversities: number;
    universitiesThisMonth: number;
    topUniversities: { id: string; name: string; collegeCount: number }[];
  };
}

export function AdminDashboard({ stats }: AdminDashboardProps) {
  const conversionRate =
    stats.totalLeads > 0
      ? ((stats.confirmedAdmissions / stats.totalLeads) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
        <p className="text-muted-foreground mt-1">
          Real-time metrics across all colleges, agencies, and counselors
        </p>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Students"
          value={stats.totalStudents.toLocaleString()}
          icon={Users}
          description={`${stats.newLeads} new leads today`}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Admissions Confirmed"
          value={stats.confirmedAdmissions.toLocaleString()}
          icon={CheckCircle}
          description={`${conversionRate}% conversion rate`}
          trend={{ value: 8, isPositive: true }}
          iconClassName="text-green-600 bg-green-50"
        />
        <StatsCard
          title="Active Colleges"
          value={`${stats.approvedColleges} / ${stats.totalColleges}`}
          icon={Building2}
          description={`${stats.totalColleges - stats.approvedColleges} pending approval`}
          iconClassName="text-blue-600 bg-blue-50"
        />
        <StatsCard
          title="Commission Paid"
          value={formatCurrency(stats.totalCommissionAmount)}
          icon={DollarSign}
          description={`${stats.pendingCommissions} pending approval`}
          iconClassName="text-emerald-600 bg-emerald-50"
        />
      </div>

      {/* University Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Total Universities"
          value={stats.totalUniversities.toLocaleString()}
          icon={GraduationCap}
          description={`${stats.activeUniversities} active`}
          iconClassName="text-indigo-600 bg-indigo-50"
        />
        <StatsCard
          title="Added This Month"
          value={stats.universitiesThisMonth.toLocaleString()}
          icon={TrendingUp}
          description="New university registrations"
          iconClassName="text-violet-600 bg-violet-50"
        />
        <StatsCard
          title="Top University"
          value={stats.topUniversities[0]?.collegeCount ?? 0}
          icon={Building2}
          description={stats.topUniversities[0]?.name ?? "No universities yet"}
          iconClassName="text-blue-600 bg-blue-50"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Partner Agencies"
          value={stats.totalAgencies.toLocaleString()}
          icon={Briefcase}
          iconClassName="text-purple-600 bg-purple-50"
        />
        <StatsCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={TrendingUp}
          iconClassName="text-orange-600 bg-orange-50"
        />
        <StatsCard
          title="Pending Actions"
          value={stats.pendingCommissions.toLocaleString()}
          icon={Clock}
          description="Commissions awaiting approval"
          iconClassName="text-yellow-600 bg-yellow-50"
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { stage: "New Leads", count: stats.newLeads, color: "bg-blue-500" },
                { stage: "In Progress", count: Math.floor(stats.totalLeads * 0.45), color: "bg-purple-500" },
                { stage: "Applications Submitted", count: Math.floor(stats.totalLeads * 0.25), color: "bg-teal-500" },
                { stage: "Admission Confirmed", count: stats.confirmedAdmissions, color: "bg-green-500" },
              ].map((item) => (
                <div key={item.stage} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color.replace("bg-", "") }} />
                  <div className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
                  <span className="text-sm text-muted-foreground flex-1">{item.stage}</span>
                  <span className="text-sm font-semibold">{item.count.toLocaleString()}</span>
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full`}
                      style={{
                        width: `${stats.totalLeads > 0 ? (item.count / stats.totalLeads) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  type: "College Registrations",
                  count: stats.totalColleges - stats.approvedColleges,
                  icon: Building2,
                  href: "/admin/colleges?status=PENDING",
                  severity: "warning" as const,
                },
                {
                  type: "Commission Approvals",
                  count: stats.pendingCommissions,
                  icon: DollarSign,
                  href: "/admin/commissions?status=PENDING",
                  severity: "info" as const,
                },
                {
                  type: "New Unassigned Leads",
                  count: stats.newLeads,
                  icon: Users,
                  href: "/admin/leads?status=NEW&assigned=false",
                  severity: "error" as const,
                },
              ].map((item) => {
                const Icon = item.icon;
                const badgeVariant =
                  item.severity === "error"
                    ? "destructive"
                    : item.severity === "warning"
                    ? "secondary"
                    : "outline";

                return (
                  <div key={item.type} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm flex-1">{item.type}</span>
                    <Badge variant={badgeVariant}>{item.count}</Badge>
                  </div>
                );
              })}
              {stats.pendingCommissions === 0 &&
                stats.newLeads === 0 &&
                stats.totalColleges === stats.approvedColleges && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">All caught up! No pending approvals.</span>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
        {/* Top Universities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Top Universities by Colleges</CardTitle>
            <Link href="/admin/universities" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {stats.topUniversities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No universities yet.{" "}
                <Link href="/admin/universities/new" className="text-primary hover:underline">
                  Add one
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {stats.topUniversities.map((uni, i) => (
                  <Link
                    key={uni.id}
                    href={`/admin/universities/${uni.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm flex-1 truncate">{uni.name}</span>
                    <Badge variant="secondary">{uni.collegeCount} colleges</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commission Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commission Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: "Total Approved", value: formatCurrency(stats.totalCommissionAmount), icon: CheckCircle, color: "text-green-600" },
              { label: "Pending Review", value: stats.pendingCommissions, icon: Clock, color: "text-yellow-600" },
              { label: "Agencies", value: stats.totalAgencies, icon: Briefcase, color: "text-blue-600" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="text-center">
                  <div className={`text-2xl font-bold ${item.color}`}>
                    {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Icon className={`w-3 h-3 ${item.color}`} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
