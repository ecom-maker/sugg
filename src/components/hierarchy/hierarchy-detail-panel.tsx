"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { MetricsBadge } from "./metrics-badge";
import type { HierarchyMetrics } from "@/lib/hierarchy-metrics";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type NodeType = "country" | "state" | "district" | "branch" | "team" | "counselor";

interface SelectedNode {
  id: string;
  type: NodeType;
  label: string;
  subtitle?: string;
  needsReview?: boolean;
  metrics: HierarchyMetrics;
}

interface HierarchyDetailPanelProps {
  node: SelectedNode | null;
  breadcrumb: SelectedNode[];
}

const TYPE_LABELS: Record<NodeType, string> = {
  country: "Country",
  state: "State",
  district: "District",
  branch: "Branch",
  team: "Team",
  counselor: "Counselor",
};

export function HierarchyDetailPanel({ node, breadcrumb }: HierarchyDetailPanelProps) {
  const [metrics, setMetrics] = useState<HierarchyMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!node) {
      setMetrics(null);
      return;
    }

    setLoading(true);
    fetch(`/api/hierarchy/node/${node.type}/${node.id}/metrics`)
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data.metrics ?? node.metrics);
      })
      .catch(() => setMetrics(node.metrics))
      .finally(() => setLoading(false));
  }, [node]);

  if (!node) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        <p>Select a node in the tree to view detailed metrics and context.</p>
      </div>
    );
  }

  const displayMetrics = metrics ?? node.metrics;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 sticky top-4">
      <div>
        <Badge variant="outline" className="mb-2">
          {TYPE_LABELS[node.type]}
        </Badge>
        <h3 className="text-lg font-semibold">{node.label}</h3>
        {node.subtitle && <p className="text-sm text-muted-foreground">{node.subtitle}</p>}
        {node.needsReview && (
          <div className="flex items-center gap-1.5 mt-2 text-amber-700 text-xs bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Branch district changed — team needs review
          </div>
        )}
      </div>

      {breadcrumb.length > 1 && (
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p className="font-medium text-foreground mb-1">Path</p>
          {breadcrumb.map((b) => b.label).join(" → ")}
        </div>
      )}

      <div className="border-t pt-3">
        <p className="text-sm font-medium mb-2">Performance</p>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading metrics...
          </div>
        ) : (
          <MetricsBadge metrics={displayMetrics} />
        )}
      </div>

      {node.type === "team" && (
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href={`/agency/teams/${node.id}`}>Manage Team</Link>
        </Button>
      )}
      {node.type === "branch" && (
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href={`/agency/branches/${node.id}`}>View Branch</Link>
        </Button>
      )}
    </div>
  );
}
