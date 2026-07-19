"use client";

import Link from "next/link";
import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { leadStatusClass, leadStatusLabel, type LeadStatus } from "@/types";
import { LeadsKanban, LeadsViewToggle, type KanbanLead, type LeadsView } from "@/components/leads/leads-kanban";

export interface BranchLeadRow {
  id: string;
  code: string | null;
  status: LeadStatus;
  name: string;
  mobile: string;
  agency: string | null;
  assignedTo: string | null;
  createdAtLabel: string;
}

export function BranchLeadsView({ rows }: { rows: BranchLeadRow[] }) {
  const [view, setView] = useState<LeadsView>("list");

  const boardLeads: KanbanLead[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    status: r.status,
    name: r.name,
    mobile: r.mobile,
    subtitle: r.agency,
    assignedTo: r.assignedTo,
    href: `/counselor/leads/${r.id}`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <LeadsViewToggle view={view} onChange={setView} />
      </div>

      {view === "board" ? (
        <LeadsKanban leads={boardLeads} />
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Agency</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Assigned To</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                  <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />No leads in this branch yet.
                </td></tr>
              ) : rows.map((l) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/counselor/leads/${l.id}`} className="font-medium hover:text-primary transition-colors">
                      {l.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {l.code && <span className="font-mono">{l.code} · </span>}{l.mobile}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{l.agency ?? "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{l.assignedTo ?? "Unassigned"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${leadStatusClass(l.status)}`}>
                      {leadStatusLabel(l.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{l.createdAtLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
