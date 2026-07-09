"use client";

import { useState } from "react";
import { HierarchyTree } from "./hierarchy-tree";
import { HierarchyDetailPanel } from "./hierarchy-detail-panel";
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
}

export function HierarchyView() {
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<TreeNode[]>([]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <HierarchyTree
          onSelectNode={(node, path) => {
            setSelectedNode(node);
            setBreadcrumb(path);
          }}
        />
      </div>
      <HierarchyDetailPanel node={selectedNode} breadcrumb={breadcrumb} />
    </div>
  );
}
