"use client";

import type { HierarchyMetrics } from "@/lib/hierarchy-metrics";
import { formatCurrency } from "@/lib/utils";

interface CompareItem {
  id: string;
  label: string;
  subtitle?: string;
  metrics: HierarchyMetrics;
}

export function ComparisonTable({ items, title }: { items: CompareItem[]; title: string }) {
  const rows: { key: keyof HierarchyMetrics; label: string; format?: (v: number) => string }[] = [
    { key: "totalLeads", label: "Total Leads" },
    { key: "activeStudents", label: "Active Students" },
    { key: "admissionsConfirmed", label: "Admissions Confirmed" },
    { key: "conversionRate", label: "Conversion Rate (%)", format: (v) => `${v}%` },
    { key: "commissionGenerated", label: "Commission Generated", format: (v) => formatCurrency(v) },
    { key: "commissionPaid", label: "Commission Paid", format: (v) => formatCurrency(v) },
    { key: "pendingFollowups", label: "Pending Follow-ups" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Metric</th>
              {items.map((item) => (
                <th key={item.id} className="px-4 py-3 text-center font-medium min-w-32">
                  <p>{item.label}</p>
                  {item.subtitle && <p className="text-xs text-muted-foreground font-normal">{item.subtitle}</p>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium text-muted-foreground">{row.label}</td>
                {items.map((item) => {
                  const val = item.metrics[row.key] as number;
                  return (
                    <td key={item.id} className="px-4 py-3 text-center font-semibold">
                      {row.format ? row.format(val) : val.toLocaleString()}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
