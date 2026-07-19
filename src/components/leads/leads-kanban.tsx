"use client";

import Link from "next/link";
import { List, LayoutGrid, Phone } from "lucide-react";
import { LEAD_STATUS_CONFIG, type LeadStatus } from "@/types";

export type LeadsView = "list" | "board";

export interface KanbanLead {
  id: string;
  code: string | null;
  status: LeadStatus;
  name: string;
  mobile: string;
  /** Secondary line, e.g. interested course or agency. */
  subtitle?: string | null;
  assignedTo?: string | null;
  href: string;
}

// Pipeline order for the board columns.
const STATUS_ORDER = Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[];

/** List / Board switch. */
export function LeadsViewToggle({ view, onChange }: { view: LeadsView; onChange: (v: LeadsView) => void }) {
  const base = "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors";
  return (
    <div className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5">
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`${base} ${view === "list" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        aria-pressed={view === "list"}
      >
        <List className="w-4 h-4" /> List
      </button>
      <button
        type="button"
        onClick={() => onChange("board")}
        className={`${base} ${view === "board" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        aria-pressed={view === "board"}
      >
        <LayoutGrid className="w-4 h-4" /> Board
      </button>
    </div>
  );
}

/** Read-only Kanban board: leads grouped into columns by status. */
export function LeadsKanban({ leads }: { leads: KanbanLead[] }) {
  const byStatus = new Map<LeadStatus, KanbanLead[]>();
  for (const s of STATUS_ORDER) byStatus.set(s, []);
  for (const lead of leads) {
    if (!byStatus.has(lead.status)) byStatus.set(lead.status, []);
    byStatus.get(lead.status)!.push(lead);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUS_ORDER.map((status) => {
        const config = LEAD_STATUS_CONFIG[status];
        const items = byStatus.get(status) ?? [];
        return (
          <div key={status} className="w-72 shrink-0 rounded-lg bg-muted/30 p-2.5">
            <div className="flex items-center justify-between gap-2 px-1 pb-2.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                {config.label}
              </span>
              <span className="text-xs font-medium text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1 py-6 text-center">No leads</p>
              ) : (
                items.map((lead) => (
                  <Link
                    key={lead.id}
                    href={lead.href}
                    className="block rounded-lg border bg-card p-3 hover:border-primary/50 hover:shadow-sm transition-all"
                  >
                    <div className="font-medium text-sm truncate">{lead.name}</div>
                    {lead.code && <div className="font-mono text-[11px] text-muted-foreground mt-0.5">{lead.code}</div>}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span className="truncate">{lead.mobile}</span>
                    </div>
                    {lead.subtitle && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">{lead.subtitle}</div>
                    )}
                    {lead.assignedTo && (
                      <div className="text-[11px] text-muted-foreground mt-2 pt-2 border-t truncate">
                        {lead.assignedTo}
                      </div>
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
