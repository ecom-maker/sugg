"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComparisonTable } from "@/components/hierarchy/comparison-table";

export default function TeamComparePage() {
  const [teams, setTeams] = useState<{ id: string; teamName: string; branch: { branchName: string } }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [items, setItems] = useState<{ id: string; label: string; subtitle?: string; metrics: import("@/lib/hierarchy-metrics").HierarchyMetrics }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/teams").then((r) => r.json()).then((d) => setTeams(d.teams ?? []));
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const runCompare = async () => {
    if (selected.length < 2) return;
    setLoading(true);
    const res = await fetch(`/api/hierarchy/compare?type=team&ids=${selected.join(",")}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/hierarchy"><ArrowLeft className="w-4 h-4 mr-2" />Back to Hierarchy</Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Team Comparison</h1>
        <p className="text-muted-foreground text-sm">Compare team performance (read-only analytics)</p>
      </div>

      <Button onClick={runCompare} disabled={selected.length < 2 || loading}>
        {loading ? "Comparing..." : `Compare (${selected.length} selected)`}
      </Button>

      <div className="border rounded-xl p-4 space-y-2">
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No teams yet. Create teams under Agency → Teams.</p>
        ) : (
          teams.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} />
              {t.teamName} — {t.branch.branchName}
            </label>
          ))
        )}
      </div>

      {items.length > 0 && <ComparisonTable items={items} title="Team Comparison Results" />}
    </div>
  );
}
