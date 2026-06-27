"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Filter, Building2, CheckCircle, XCircle, Clock, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateCollegeStatus } from "@/actions/colleges";
import { toast } from "@/hooks/use-toast";
import type { CollegeStatus } from "@/types";

interface College {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  officialEmail: string;
  status: CollegeStatus;
  isVerified: boolean;
  createdAt: Date;
  _count: { courses: number; applications: number };
}

const statusConfig: Record<CollegeStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  APPROVED: { label: "Approved", variant: "success" },
  PENDING: { label: "Pending", variant: "warning" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  SUSPENDED: { label: "Suspended", variant: "secondary" },
  ARCHIVED: { label: "Archived", variant: "outline" },
};

export function CollegesManagementPage({
  colleges,
  total,
  page,
  limit,
  searchParams,
}: {
  colleges: College[];
  total: number;
  page: number;
  limit: number;
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

  const handleStatusChange = async (
    collegeId: string,
    status: "APPROVED" | "REJECTED" | "SUSPENDED" | "ARCHIVED"
  ) => {
    setLoadingId(collegeId);
    const result = await updateCollegeStatus(collegeId, status);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: `College ${status.toLowerCase()}` });
      router.refresh();
    }
    setLoadingId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Colleges</h1>
          <p className="text-muted-foreground mt-1">{total} total colleges</p>
        </div>
        <Button asChild>
          <Link href="/admin/colleges/new">
            <Plus className="w-4 h-4 mr-2" />
            Add College
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search colleges..."
            defaultValue={searchParams.search}
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateFilter("search", (e.target as HTMLInputElement).value);
              }
            }}
          />
        </div>
        <Select
          value={searchParams.status ?? "all"}
          onValueChange={(v) => updateFilter("status", v)}
        >
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">College</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Location</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Courses</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Applications</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {colleges.map((college) => {
              const status = statusConfig[college.status];
              return (
                <tr key={college.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <Link
                          href={`/admin/colleges/${college.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {college.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{college.officialEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {college.city && `${college.city}, `}{college.country ?? ""}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">{college._count.courses}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{college._count.applications}</td>
                  <td className="px-4 py-3">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {college.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loadingId === college.id}
                            onClick={() => handleStatusChange(college.id, "APPROVED")}
                            className="h-7 text-green-700 border-green-200 hover:bg-green-50"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loadingId === college.id}
                            onClick={() => handleStatusChange(college.id, "REJECTED")}
                            className="h-7 text-red-700 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {college.status === "APPROVED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loadingId === college.id}
                          onClick={() => handleStatusChange(college.id, "SUSPENDED")}
                          className="h-7"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          Suspend
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" asChild className="h-7">
                        <Link href={`/admin/colleges/${college.id}`}>View</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {colleges.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No colleges found</p>
          </div>
        )}
      </div>
    </div>
  );
}
