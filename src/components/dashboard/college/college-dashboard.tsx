"use client";

import Link from "next/link";
import { FileText, BookOpen, CheckCircle, Clock, DollarSign, AlertCircle, Plus } from "lucide-react";
import { StatsCard } from "@/components/shared/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface College {
  id: string;
  name: string;
  status: string;
  logoUrl: string | null;
  isVerified: boolean;
}

interface CollegeDashboardProps {
  stats: {
    totalApplications: number;
    submittedApplications: number;
    acceptedApplications: number;
    enrolledApplications: number;
    totalCommission: number;
    totalCourses: number;
    collegeName: string;
    collegeStatus: string;
  };
  college: College | null;
}

const statusColors: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  REJECTED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-orange-100 text-orange-800",
};

export function CollegeDashboard({ stats, college }: CollegeDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{stats.collegeName}</h1>
            {college && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  statusColors[stats.collegeStatus] ?? "bg-gray-100 text-gray-800"
                }`}
              >
                {stats.collegeStatus}
              </span>
            )}
          </div>
          <p className="text-muted-foreground">College admission overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/college/courses/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Course
            </Link>
          </Button>
          <Button asChild>
            <Link href="/college/applications">
              View Applications
            </Link>
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {stats.collegeStatus === "PENDING" && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Clock className="w-5 h-5 text-yellow-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800">College Approval Pending</p>
            <p className="text-xs text-yellow-600">Your college registration is under review. You will be notified once approved.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Applications"
          value={stats.totalApplications}
          icon={FileText}
          description={`${stats.submittedApplications} awaiting review`}
        />
        <StatsCard
          title="Accepted"
          value={stats.acceptedApplications}
          icon={CheckCircle}
          iconClassName="text-green-600 bg-green-50"
        />
        <StatsCard
          title="Enrolled"
          value={stats.enrolledApplications}
          icon={CheckCircle}
          description={`${stats.totalCourses} courses offered`}
          iconClassName="text-emerald-600 bg-emerald-50"
        />
        <StatsCard
          title="Commission Earned"
          value={formatCurrency(stats.totalCommission)}
          icon={DollarSign}
          iconClassName="text-blue-600 bg-blue-50"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Pipeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Application Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Awaiting Review", count: stats.submittedApplications, color: "bg-blue-500", href: "/college/applications?status=SUBMITTED" },
                { label: "Accepted", count: stats.acceptedApplications, color: "bg-green-500", href: "/college/applications?status=ACCEPTED" },
                { label: "Enrolled", count: stats.enrolledApplications, color: "bg-emerald-600", href: "/college/applications?status=ENROLLED" },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`} />
                  <span className="text-sm flex-1">{item.label}</span>
                  <span className="text-sm font-semibold">{item.count}</span>
                  {item.count > 0 && item.label === "Awaiting Review" && (
                    <Badge variant="secondary" className="text-xs">{item.count} new</Badge>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Manage Applications", href: "/college/applications", icon: FileText },
              { label: "Add / Edit Courses", href: "/college/courses", icon: BookOpen },
              { label: "Update College Profile", href: "/college/profile", icon: CheckCircle },
              { label: "View Commission History", href: "/college/commissions", icon: DollarSign },
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
