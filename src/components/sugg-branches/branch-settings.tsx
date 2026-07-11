"use client";

import { useState } from "react";
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
import { Loader2, UserCog } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ManagerSelect } from "@/components/sugg-branches/manager-select";

type Status = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export function BranchSettings({
  suggBranchId,
  managerId,
  status,
}: {
  suggBranchId: string;
  managerId: string | null;
  status: Status;
}) {
  const router = useRouter();
  const [selectedManager, setSelectedManager] = useState<string | null>(managerId);
  const [selectedStatus, setSelectedStatus] = useState<Status>(status);
  const [saving, setSaving] = useState<null | "manager" | "status">(null);

  const save = async (field: "manager" | "status") => {
    setSaving(field);
    try {
      const body = field === "manager" ? { managerId: selectedManager } : { status: selectedStatus };
      const res = await fetch(`/api/admin/sugg-branches/${suggBranchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed", variant: "destructive" });
        return;
      }
      toast({ title: field === "manager" ? "Manager updated" : "Status updated" });
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-5">
      <h2 className="font-semibold flex items-center gap-2">
        <UserCog className="w-4 h-4 text-muted-foreground" /> Settings
      </h2>

      <div className="space-y-2">
        <Label>Branch Manager</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <ManagerSelect value={selectedManager} onChange={setSelectedManager} />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => save("manager")}
            disabled={saving === "manager" || selectedManager === managerId}
          >
            {saving === "manager" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <div className="flex gap-2">
          <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as Status)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={() => save("status")}
            disabled={saving === "status" || selectedStatus === status}
          >
            {saving === "status" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
