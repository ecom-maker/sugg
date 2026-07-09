"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { updateApplicationStatus } from "@/actions/college-applications";

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ENROLLED: "bg-purple-100 text-purple-700",
};

const NEXT_STATUS: Record<string, string[]> = {
  SUBMITTED: ["UNDER_REVIEW", "ACCEPTED", "REJECTED"],
  UNDER_REVIEW: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["ENROLLED", "REJECTED"],
  REJECTED: [],
  ENROLLED: [],
};

interface Application {
  id: string;
  status: string;
  createdAt: Date;
  student: { name: string; email: string | null; mobile: string };
  course: { name: string; degreeType: string };
}

interface StatusCount {
  status: string;
  _count: { id: number };
}

export function ApplicationsTable({
  applications,
  total,
  page,
  limit,
  courses,
  statusCounts,
  searchParams,
}: {
  applications: Application[];
  total: number;
  page: number;
  limit: number;
  courses: { id: string; name: string }[];
  statusCounts: StatusCount[];
  searchParams: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams as Record<string, string>);
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    setLoadingId(appId);
    try {
      const result = await updateApplicationStatus(appId, newStatus);
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Status updated" });
        router.refresh();
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setLoadingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const countMap: Record<string, number> = {};
  statusCounts.forEach((s) => { countMap[s.status] = s._count.id; });

  const statusTabs = [
    { key: "all", label: "All", count: total },
    { key: "SUBMITTED", label: "Submitted", count: countMap["SUBMITTED"] ?? 0 },
    { key: "UNDER_REVIEW", label: "Under Review", count: countMap["UNDER_REVIEW"] ?? 0 },
    { key: "ACCEPTED", label: "Accepted", count: countMap["ACCEPTED"] ?? 0 },
    { key: "REJECTED", label: "Rejected", count: countMap["REJECTED"] ?? 0 },
    { key: "ENROLLED", label: "Enrolled", count: countMap["ENROLLED"] ?? 0 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} applications received</p>
        </div>
        {courses.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              className="text-sm border rounded-md px-3 py-1.5 bg-background"
              value={searchParams.courseId ?? "all"}
              onChange={(e) => updateFilter("courseId", e.target.value)}
            >
              <option value="all">All Courses</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => updateFilter("status", tab.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              (searchParams.status ?? "all") === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Student</th>
              <th className="text-left px-4 py-3 font-medium">Course</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Applied</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {applications.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  <FileText className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  No applications found
                </td>
              </tr>
            ) : (
              applications.map((app) => {
                const nextStatuses = NEXT_STATUS[app.status] ?? [];
                return (
                  <tr key={app.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{app.student.name}</p>
                      <p className="text-xs text-muted-foreground">{app.student.email ?? app.student.mobile}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{app.course.name}</p>
                      <p className="text-xs text-muted-foreground">{app.course.degreeType}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[app.status] ?? ""}`}>
                        {app.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {new Date(app.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {nextStatuses.map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant="outline"
                            disabled={loadingId === app.id}
                            onClick={() => handleStatusChange(app.id, status)}
                            className="h-7 text-xs"
                          >
                            {status.replace(/_/g, " ")}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={page <= 1}
              onClick={() => updateFilter("page", String(page - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages}
              onClick={() => updateFilter("page", String(page + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
