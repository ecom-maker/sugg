"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  GraduationCap,
  Plus,
  Building2,
  Archive,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Pencil,
} from "lucide-react";
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
import {
  archiveUniversity,
  deleteUniversity,
  setUniversityStatus,
} from "@/actions/universities";
import { toast } from "@/hooks/use-toast";
import type { UniversityStatus } from "@/types";

interface UniversityRow {
  id: string;
  name: string;
  establishmentYear: number;
  location: string;
  country: string;
  status: UniversityStatus;
  updatedAt: Date;
  _count: { colleges: number };
}

const statusConfig: Record<
  UniversityStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }
> = {
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "warning" },
  ARCHIVED: { label: "Archived", variant: "outline" },
};

export function UniversitiesManagement({
  universities,
  total,
  page,
  limit,
  searchParams,
  canManage = false,
}: {
  universities: UniversityRow[];
  total: number;
  page: number;
  limit: number;
  searchParams: Record<string, string | undefined>;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    name: string;
    action: "archive" | "delete" | "activate" | "deactivate";
  } | null>(null);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams as Record<string, string>);
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    setLoadingId(confirmAction.id);

    let result: { error?: string; success?: boolean };
    switch (confirmAction.action) {
      case "archive":
        result = await archiveUniversity(confirmAction.id);
        break;
      case "delete":
        result = await deleteUniversity(confirmAction.id);
        break;
      case "activate":
        result = await setUniversityStatus(confirmAction.id, "ACTIVE");
        break;
      case "deactivate":
        result = await setUniversityStatus(confirmAction.id, "INACTIVE");
        break;
    }

    if (result?.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${confirmAction.name} updated.` });
      router.refresh();
    }

    setLoadingId(null);
    setConfirmAction(null);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Universities</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} universit{total === 1 ? "y" : "ies"} registered
          </p>
        </div>
        {canManage && (
          <Button asChild className="gap-2">
            <Link href="/admin/universities/new">
              <Plus className="w-4 h-4" />
              Add University
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by university name..."
            className="pl-9"
            defaultValue={searchParams.q ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateFilter("q", (e.target as HTMLInputElement).value);
              }
            }}
          />
        </div>
        <Select
          value={searchParams.country ?? "all"}
          onValueChange={(v) => updateFilter("country", v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            <SelectItem value="India">India</SelectItem>
            <SelectItem value="UAE">UAE</SelectItem>
            <SelectItem value="United States">United States</SelectItem>
            <SelectItem value="United Kingdom">United Kingdom</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={searchParams.status ?? "all"}
          onValueChange={(v) => updateFilter("status", v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={searchParams.sortBy ?? "name"}
          onValueChange={(v) => updateFilter("sortBy", v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="year">Sort by Year</SelectItem>
            <SelectItem value="colleges">Sort by Colleges</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-semibold text-lg">Confirm Action</h3>
            <p className="text-sm text-muted-foreground">
              {confirmAction.action === "delete"
                ? `Delete "${confirmAction.name}"? This cannot be undone.`
                : confirmAction.action === "archive"
                ? `Archive "${confirmAction.name}"? Linked colleges will remain but the university will be hidden from selection.`
                : `${confirmAction.action === "activate" ? "Activate" : "Deactivate"} "${confirmAction.name}"?`}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button
                variant={confirmAction.action === "delete" ? "destructive" : "default"}
                onClick={handleAction}
                disabled={loadingId === confirmAction.id}
              >
                {loadingId === confirmAction.id && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        {universities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <GraduationCap className="w-12 h-12 opacity-20 mb-4" />
            <p className="font-medium">No universities found</p>
            <Link href="/admin/universities/new" className="text-primary text-sm mt-2 hover:underline">
              Create your first university
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">University</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Year</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Colleges</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Country</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated</th>
                  {canManage && (
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {universities.map((uni) => {
                  const cfg = statusConfig[uni.status];
                  return (
                    <tr key={uni.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/universities/${uni.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {uni.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{uni.establishmentYear}</td>
                      <td className="px-4 py-3 text-muted-foreground">{uni.location}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          {uni._count.colleges}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{uni.country}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(uni.updatedAt).toLocaleDateString()}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild title="View">
                            <Link href={`/admin/universities/${uni.id}`}>
                              <GraduationCap className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Edit">
                            <Link href={`/admin/universities/${uni.id}/edit`}>
                              <Pencil className="w-4 h-4" />
                            </Link>
                          </Button>
                          {uni.status === "ACTIVE" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Deactivate"
                              onClick={() =>
                                setConfirmAction({ id: uni.id, name: uni.name, action: "deactivate" })
                              }
                            >
                              <XCircle className="w-4 h-4 text-amber-500" />
                            </Button>
                          ) : uni.status !== "ARCHIVED" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Activate"
                              onClick={() =>
                                setConfirmAction({ id: uni.id, name: uni.name, action: "activate" })
                              }
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </Button>
                          ) : null}
                          {uni.status !== "ARCHIVED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Archive"
                              onClick={() =>
                                setConfirmAction({ id: uni.id, name: uni.name, action: "archive" })
                              }
                            >
                              <Archive className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                          {uni._count.colleges === 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              onClick={() =>
                                setConfirmAction({ id: uni.id, name: uni.name, action: "delete" })
                              }
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams as Record<string, string>);
                params.set("page", String(page - 1));
                router.push(`?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams as Record<string, string>);
                params.set("page", String(page + 1));
                router.push(`?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
