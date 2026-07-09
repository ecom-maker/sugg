"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComparisonTable } from "@/components/hierarchy/comparison-table";

export default function GeographyComparePage() {
  const [level, setLevel] = useState<"country" | "state" | "district">("state");
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [items, setItems] = useState<{ id: string; label: string; subtitle?: string; metrics: import("@/lib/hierarchy-metrics").HierarchyMetrics }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      if (level === "country") {
        const res = await fetch("/api/geo/countries");
        const data = await res.json();
        setOptions((data.countries ?? []).map((c: { id: string; countryName: string }) => ({ id: c.id, label: c.countryName })));
      } else if (level === "state") {
        const res = await fetch("/api/geo/countries");
        const data = await res.json();
        const allStates: { id: string; label: string }[] = [];
        for (const c of data.countries ?? []) {
          const sRes = await fetch(`/api/geo/states?countryId=${c.id}`);
          const sData = await sRes.json();
          for (const s of sData.states ?? []) {
            allStates.push({ id: s.id, label: `${s.stateName} (${c.countryName})` });
          }
        }
        setOptions(allStates);
      } else {
        const res = await fetch("/api/geo/countries");
        const data = await res.json();
        const allDistricts: { id: string; label: string }[] = [];
        for (const c of data.countries ?? []) {
          const sRes = await fetch(`/api/geo/states?countryId=${c.id}`);
          const sData = await sRes.json();
          for (const s of sData.states ?? []) {
            const dRes = await fetch(`/api/geo/districts?stateId=${s.id}`);
            const dData = await dRes.json();
            for (const d of dData.districts ?? []) {
              allDistricts.push({ id: d.id, label: `${d.districtName}, ${s.stateName}` });
            }
          }
        }
        setOptions(allDistricts);
      }
      setSelected([]);
      setItems([]);
    }
    loadOptions();
  }, [level]);

  const runCompare = async () => {
    if (selected.length < 2) return;
    setLoading(true);
    const res = await fetch(`/api/hierarchy/compare?type=geography&level=${level}&ids=${selected.join(",")}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  };

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/hierarchy"><ArrowLeft className="w-4 h-4 mr-2" />Back to Hierarchy</Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Geography Comparison</h1>
        <p className="text-muted-foreground text-sm">Compare 2–4 regions side by side</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-sm font-medium">Level</label>
          <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
            <SelectTrigger className="w-40 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="country">Country</SelectItem>
              <SelectItem value="state">State</SelectItem>
              <SelectItem value="district">District</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={runCompare} disabled={selected.length < 2 || loading}>
          {loading ? "Comparing..." : `Compare (${selected.length} selected)`}
        </Button>
      </div>

      <div className="border rounded-xl p-4 max-h-64 overflow-y-auto space-y-2">
        {options.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} />
            {o.label}
          </label>
        ))}
      </div>

      {items.length > 0 && <ComparisonTable items={items} title="Geography Comparison Results" />}
    </div>
  );
}
