"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter, Plus, ChevronLeft, ChevronRight, MessageSquare, Phone } from "lucide-react";
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
import { LEAD_STATUS_CONFIG, type LeadStatus, type LeadSource } from "@/types";
import { formatRelativeTime } from "@/lib/utils";

interface Lead {
  id: string;
  status: LeadStatus;
  score: number;
  updatedAt: Date;
  student: {
    id: string;
    name: string;
    mobile: string;
    email: string | null;
    city: string | null;
    interestedCourse: string | null;
    source: LeadSource;
  };
  assignedTo: { fullName: string } | null;
  _count: { notes: number; followups: number };
}

interface LeadsPageProps {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  searchParams: { status?: string; search?: string; page?: string };
}

const sourceLabels: Record<LeadSource, string> = {
  WHATSAPP: "WhatsApp",
  AGENCY_REFERRAL: "Agency",
  MANUAL_ENTRY: "Manual",
};

export function LeadsPage({ leads, total, page, limit, searchParams }: LeadsPageProps) {
  const router = useRouter();
  const totalPages = Math.ceil(total / limit);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams as Record<string, string>);
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Leads</h1>
          <p className="text-muted-foreground mt-1">
            {total.toLocaleString()} total leads
          </p>
        </div>
        <Button asChild>
          <Link href="/counselor/leads/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email..."
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
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(LEAD_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lead List */}
      <div className="space-y-2">
        {leads.length === 0 ? (
          <div className="text-center py-16 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">No leads found</p>
            <Button variant="link" onClick={() => router.push("?")}>
              Clear filters
            </Button>
          </div>
        ) : (
          leads.map((lead) => {
            const statusConfig = LEAD_STATUS_CONFIG[lead.status];
            return (
              <div
                key={lead.id}
                className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {lead.student.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/students/${lead.student.id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {lead.student.name}
                    </Link>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {sourceLabels[lead.student.source]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
                    <span>{lead.student.mobile}</span>
                    {lead.student.interestedCourse && (
                      <>
                        <span>·</span>
                        <span>{lead.student.interestedCourse}</span>
                      </>
                    )}
                    {lead.student.city && (
                      <>
                        <span>·</span>
                        <span>{lead.student.city}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{lead._count.notes} notes</span>
                    <span>·</span>
                    <span>{lead._count.followups} follow-ups</span>
                    <span>·</span>
                    <span>Updated {formatRelativeTime(lead.updatedAt)}</span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-center shrink-0 hidden sm:block">
                  <div className="text-lg font-bold text-foreground">{lead.score}</div>
                  <div className="text-xs text-muted-foreground">Score</div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                    <Link href={`/counselor/whatsapp?studentId=${lead.student.mobile}`}>
                      <MessageSquare className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                    <a href={`tel:${lead.student.mobile}`}>
                      <Phone className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={`/counselor/leads/${lead.id}`}>View</Link>
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateFilter("page", String(page - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateFilter("page", String(page + 1))}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
