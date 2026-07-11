"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Globe2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { GeoPicker, type GeoValue } from "@/components/sugg-branches/geo-picker";

export interface TerritoryRow {
  id: string;
  countryName: string;
  stateName: string | null;
  districtName: string | null;
}

function territoryLabel(t: TerritoryRow): { text: string; level: string } {
  if (t.districtName) return { text: `${t.districtName}, ${t.stateName}, ${t.countryName}`, level: "District" };
  if (t.stateName) return { text: `${t.stateName}, ${t.countryName}`, level: "State" };
  return { text: t.countryName, level: "Country" };
}

export function TerritoryManager({
  suggBranchId,
  territories,
}: {
  suggBranchId: string;
  territories: TerritoryRow[];
}) {
  const router = useRouter();
  const [geo, setGeo] = useState<GeoValue>({ countryId: null, stateId: null, districtId: null });
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const addTerritory = async () => {
    if (!geo.countryId) {
      toast({ title: "Select at least a country", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/admin/sugg-branches/${suggBranchId}/territories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geo),
      });
      const data = await res.json();
      if (!res.ok) {
        // Overlap conflict names the conflicting branch.
        toast({ title: "Cannot add territory", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Territory added" });
      setGeo({ countryId: null, stateId: null, districtId: null });
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const removeTerritory = async (territoryId: string) => {
    setRemovingId(territoryId);
    try {
      const res = await fetch(
        `/api/admin/sugg-branches/${suggBranchId}/territories/${territoryId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Error", description: data.error ?? "Failed to remove", variant: "destructive" });
        return;
      }
      toast({ title: "Territory removed" });
      router.refresh();
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Globe2 className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-semibold">Territories</h2>
        <span className="text-xs text-muted-foreground">({territories.length})</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Areas this branch covers. A district match wins over a state match, which wins over a
        country match. Overlapping the same area as another active branch is rejected.
      </p>

      {territories.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No territories yet — add one below.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {territories.map((t) => {
            const { text, level } = territoryLabel(t);
            return (
              <li key={t.id} className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="secondary">{level}</Badge>
                  <span className="text-sm truncate">{text}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTerritory(t.id)}
                  disabled={removingId === t.id}
                >
                  {removingId === t.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-destructive" />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t pt-4 space-y-3">
        <p className="text-sm font-medium">Add coverage</p>
        <GeoPicker value={geo} onChange={setGeo} territoryMode />
        <Button type="button" size="sm" onClick={addTerritory} disabled={adding} className="gap-2">
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add territory
        </Button>
      </div>
    </div>
  );
}
