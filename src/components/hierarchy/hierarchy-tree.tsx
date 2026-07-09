"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  Globe,
  Map,
  MapPin,
  Building2,
  Users,
  User,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricsBadge } from "./metrics-badge";
import type { HierarchyMetrics } from "@/lib/hierarchy-metrics";

type NodeType = "country" | "state" | "district" | "branch" | "team" | "counselor";

interface TreeNode {
  id: string;
  type: NodeType;
  label: string;
  subtitle?: string;
  hasChildren: boolean;
  needsReview?: boolean;
  metrics: HierarchyMetrics;
  agencyUserId?: string;
}

const ICONS: Record<NodeType, React.ElementType> = {
  country: Globe,
  state: Map,
  district: MapPin,
  branch: Building2,
  team: Users,
  counselor: User,
};

const CHILD_LEVEL: Partial<Record<NodeType, NodeType>> = {
  country: "state",
  state: "district",
  district: "branch",
  branch: "team",
  team: "counselor",
};

interface HierarchyTreeProps {
  onSelectNode?: (node: TreeNode, breadcrumb: TreeNode[]) => void;
  readOnly?: boolean;
}

export function HierarchyTree({ onSelectNode, readOnly = false }: HierarchyTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [children, setChildren] = useState<Record<string, TreeNode[]>>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roots, setRoots] = useState<TreeNode[]>([]);
  const [rootsLoading, setRootsLoading] = useState(true);
  const [breadcrumb, setBreadcrumb] = useState<TreeNode[]>([]);

  const loadLevel = useCallback(async (level: NodeType, parentId?: string): Promise<TreeNode[]> => {
    const params = new URLSearchParams({ level });
    if (parentId) params.set("parentId", parentId);
    const res = await fetch(`/api/hierarchy/tree?${params}`);
    const data = await res.json();
    return data.nodes ?? [];
  }, []);

  useEffect(() => {
    loadLevel("country").then((nodes) => {
      setRoots(nodes);
      setRootsLoading(false);
    });
  }, [loadLevel]);

  const toggle = async (node: TreeNode, path: TreeNode[]) => {
    const key = `${node.type}:${node.id}`;
    setSelectedId(key);
    setBreadcrumb(path);
    onSelectNode?.(node, path);

    if (!node.hasChildren) return;

    if (expanded.has(key)) {
      const next = new Set(expanded);
      next.delete(key);
      setExpanded(next);
      return;
    }

    const childLevel = CHILD_LEVEL[node.type];
    if (!childLevel) return;

    if (!children[key]) {
      setLoading((prev) => new Set(prev).add(key));
      const nodes = await loadLevel(childLevel, node.id);
      setChildren((prev) => ({ ...prev, [key]: nodes }));
      setLoading((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }

    setExpanded((prev) => new Set(prev).add(key));
  };

  const renderNode = (node: TreeNode, depth: number, path: TreeNode[]) => {
    const key = `${node.type}:${node.id}`;
    const isExpanded = expanded.has(key);
    const isLoading = loading.has(key);
    const isSelected = selectedId === key;
    const Icon = ICONS[node.type];
    const nodeChildren = children[key] ?? [];

    return (
      <div key={key}>
        <button
          type="button"
          onClick={() => toggle(node, path)}
          className={cn(
            "w-full flex items-start gap-2 px-3 py-2.5 rounded-lg text-left transition-colors",
            isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50",
            readOnly && node.type === "branch" && depth === 0 && "cursor-default"
          )}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          <span className="mt-0.5 shrink-0 text-muted-foreground">
            {node.hasChildren ? (
              isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )
            ) : (
              <span className="w-4 inline-block" />
            )}
          </span>
          <Icon className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{node.label}</span>
              {node.subtitle && (
                <span className="text-xs text-muted-foreground">{node.subtitle}</span>
              )}
              {node.needsReview && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Review</span>
              )}
            </div>
            <MetricsBadge metrics={node.metrics} compact />
          </div>
        </button>

        {isExpanded && nodeChildren.map((child) =>
          renderNode(child, depth + 1, [...path, node])
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground px-1">
          {breadcrumb.map((b, i) => (
            <span key={`${b.type}:${b.id}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              <span className={i === breadcrumb.length - 1 ? "text-foreground font-medium" : ""}>
                {b.label}
              </span>
            </span>
          ))}
        </div>
      )}

      <div className="border rounded-xl divide-y overflow-hidden bg-card">
        {rootsLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Globe className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Loading geographic hierarchy...</p>
          </div>
        ) : roots.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Globe className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No geographic data. Run geo seed migration.</p>
          </div>
        ) : (
          <div className="py-1">
            {roots.map((node) => renderNode(node, 0, []))}
          </div>
        )}
      </div>
    </div>
  );
}
