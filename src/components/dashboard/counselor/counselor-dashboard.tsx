"use client";

import Link from "next/link";
import { Users, CheckCircle, Clock, AlertCircle, TrendingUp, MessageSquare, Calendar, Plus, UsersRound, Crown } from "lucide-react";
import { StatsCard } from "@/components/shared/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LEAD_STATUS_CONFIG, type LeadStatus } from "@/types";
import { formatRelativeTime } from "@/lib/utils";

interface RecentLead {
  id: string;
  status: LeadStatus;
  createdAt: Date;
  student: {
    name: string;
    mobile: string;
    interestedCourse: string | null;
    city: string | null;
  };
}

interface CounselorDashboardProps {
  stats: {
    totalLeads: number;
    contactedLeads: number;
    confirmedAdmissions: number;
    pendingFollowups: number;
    overdueFollowups: number;
    conversionRate: number;
  };
  recentLeads: RecentLead[];
  teamContext?: {
    teamName: string;
    teamLeadName: string | null;
    branchName: string | null;
    geoBreadcrumb: string[];
    teamRank: number | null;
  } | null;
}

export function CounselorDashboard({ stats, recentLeads, teamContext }: CounselorDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your leads and track your performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/counselor/whatsapp">
              <MessageSquare className="w-4 h-4 mr-2" />
              WhatsApp
            </Link>
          </Button>
          <Button asChild>
            <Link href="/counselor/leads/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Link>
          </Button>
        </div>
      </div>

      {teamContext && (
        <Card className="border-indigo-200 bg-indigo-50/40">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex items-center gap-2">
                <UsersRound className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="font-semibold text-indigo-900">{teamContext.teamName}</p>
                  <p className="text-xs text-indigo-700">
                    {teamContext.branchName && `${teamContext.branchName} · `}
                    {teamContext.geoBreadcrumb.join(" → ")}
                  </p>
                </div>
              </div>
              {teamContext.teamLeadName && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Crown className="w-4 h-4 text-amber-600" />
                  <span>
                    Lead: <strong>{teamContext.teamLeadName}</strong>
                  </span>
                </div>
              )}
              {teamContext.teamRank && (
                <Badge variant="secondary">Team Rank #{teamContext.teamRank}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Assigned Leads"
          value={stats.totalLeads}
          icon={Users}
          description={`${stats.contactedLeads} contacted`}
        />
        <StatsCard
          title="Admissions"
          value={stats.confirmedAdmissions}
          icon={CheckCircle}
          description={`${stats.conversionRate}% conversion`}
          iconClassName="text-green-600 bg-green-50"
        />
        <StatsCard
          title="Pending Follow-ups"
          value={stats.pendingFollowups}
          icon={Calendar}
          description={stats.overdueFollowups > 0 ? `${stats.overdueFollowups} overdue` : "All on time"}
          iconClassName={stats.overdueFollowups > 0 ? "text-red-600 bg-red-50" : "text-blue-600 bg-blue-50"}
        />
        <StatsCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          icon={TrendingUp}
          iconClassName="text-purple-600 bg-purple-50"
        />
      </div>

      {/* Overdue Alert */}
      {stats.overdueFollowups > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              {stats.overdueFollowups} overdue follow-up{stats.overdueFollowups > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-red-600">These leads haven&apos;t been followed up on time</p>
          </div>
          <Button size="sm" variant="destructive" asChild>
            <Link href="/counselor/followups?filter=overdue">View All</Link>
          </Button>
        </div>
      )}

      {/* Recent Leads & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Leads</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/counselor/leads">View all →</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentLeads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No leads assigned yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentLeads.map((lead) => {
                    const statusConfig = LEAD_STATUS_CONFIG[lead.status];
                    return (
                      <Link
                        key={lead.id}
                        href={`/counselor/leads/${lead.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold shrink-0">
                          {lead.student.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{lead.student.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {lead.student.interestedCourse || "Course not specified"}
                            {lead.student.city && ` · ${lead.student.city}`}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                          >
                            {statusConfig.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(lead.createdAt)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Schedule Follow-up", href: "/counselor/followups/new", icon: Calendar },
                { label: "Send WhatsApp", href: "/counselor/whatsapp", icon: MessageSquare },
                { label: "View My Tasks", href: "/counselor/tasks", icon: Clock },
                { label: "Submit Application", href: "/counselor/applications/new", icon: CheckCircle },
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

          {/* Performance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "Leads Contacted", value: stats.contactedLeads, max: stats.totalLeads },
                  { label: "Admissions", value: stats.confirmedAdmissions, max: stats.totalLeads },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${item.max > 0 ? (item.value / item.max) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
