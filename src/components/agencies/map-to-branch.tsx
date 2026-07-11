"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, GitBranch } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BranchOption {
  id: string;
  branchName: string;
}

const NONE = "__none__";

/**
 * Maps an agency to a covering Sugg Branch (or unassigns it). Wraps
 * PUT /api/admin/agencies/[id]/sugg-branch.
 */
export function MapToBranch({
  agencyId,
  currentBranchId,
}: {
  agencyId: string;
  currentBranchId: string | null;
}) {
  const router = useRouter();
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selected, setSelected] = useState<string | null>(currentBranchId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/sugg-branches?status=ACTIVE&limit=100")
      .then((r) => r.json())
      .then((d) =>
        setBranches(
          (d.branches ?? []).map((b: { id: string; branchName: string }) => ({
            id: b.id,
            branchName: b.branchName,
          }))
        )
      )
      .catch(() => setBranches([]));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/agencies/${agencyId}/sugg-branch`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggBranchId: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to map", variant: "destructive" });
        return;
      }
      toast({ title: selected ? "Agency mapped to Sugg Branch" : "Agency unassigned" });
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <h2 className="font-semibold flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-muted-foreground" /> Covering Sugg Branch
      </h2>
      <p className="text-xs text-muted-foreground">
        Map this agency to the Sugg Branch that manages it. Reassignment is audited.
      </p>
      <div className="space-y-2">
        <Label>Sugg Branch</Label>
        <Select
          value={selected ?? NONE}
          onValueChange={(v) => setSelected(v === NONE ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a Sugg Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Unassigned</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.branchName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={save}
        disabled={saving || selected === currentBranchId}
        className="gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Save mapping
      </Button>
    </div>
  );
}
