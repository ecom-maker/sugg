"use client";

import type { HierarchyMetrics } from "@/lib/hierarchy-metrics";
import { formatCurrency } from "@/lib/utils";

export function MetricsBadge({ metrics, compact = false }: { metrics: HierarchyMetrics; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{metrics.totalLeads} leads</span>
        <span>·</span>
        <span>{metrics.admissionsConfirmed} admitted</span>
        <span>·</span>
        <span>{metrics.conversionRate}% conv.</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      {[
        { label: "Leads", value: metrics.totalLeads },
        { label: "Students", value: metrics.activeStudents },
        { label: "Admitted", value: metrics.admissionsConfirmed },
        { label: "Conv. %", value: `${metrics.conversionRate}%` },
        { label: "Comm. Gen.", value: formatCurrency(metrics.commissionGenerated) },
        { label: "Comm. Paid", value: formatCurrency(metrics.commissionPaid) },
        { label: "Follow-ups", value: metrics.pendingFollowups },
      ].map((m) => (
        <div key={m.label} className="bg-muted/40 rounded px-2 py-1">
          <p className="text-muted-foreground">{m.label}</p>
          <p className="font-semibold">{m.value}</p>
        </div>
      ))}
    </div>
  );
}
