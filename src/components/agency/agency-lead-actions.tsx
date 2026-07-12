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
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { updateLeadStatus } from "@/actions/leads";
import { reassignAgencyLead } from "@/actions/agency-leads";
import type { LeadStatus } from "@/types";

const STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "COUNSELING_SCHEDULED",
  "COLLEGE_SHORTLISTED",
  "APPLICATION_SUBMITTED",
  "OFFER_RECEIVED",
  "ADMISSION_CONFIRMED",
  "LOST",
];

const label = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());

export function AgencyLeadActions({
  leadId,
  currentStatus,
  currentAssigneeId,
  counselors,
}: {
  leadId: string;
  currentStatus: LeadStatus;
  currentAssigneeId: string | null;
  counselors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<LeadStatus>(currentStatus);
  const [assignee, setAssignee] = useState<string>(currentAssigneeId ?? "");
  const [busy, setBusy] = useState<null | "status" | "assign">(null);

  const saveStatus = async (next: LeadStatus) => {
    setStatus(next);
    setBusy("status");
    const reason = next === "LOST" ? window.prompt("Reason for marking as LOST?") ?? undefined : undefined;
    const res = await updateLeadStatus(leadId, next, reason);
    if (res.error) {
      toast({ title: "Error", description: String(res.error), variant: "destructive" });
      setStatus(currentStatus);
    } else {
      toast({ title: "Status updated" });
      router.refresh();
    }
    setBusy(null);
  };

  const saveAssignee = async () => {
    if (!assignee || assignee === currentAssigneeId) return;
    setBusy("assign");
    const res = await reassignAgencyLead(leadId, assignee);
    if (res.error) {
      toast({ title: "Error", description: String(res.error), variant: "destructive" });
    } else {
      toast({ title: "Lead reassigned" });
      router.refresh();
    }
    setBusy(null);
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <h2 className="font-semibold">Manage lead</h2>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={(v) => saveStatus(v as LeadStatus)} disabled={busy !== null}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {label(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {counselors.length > 0 && (
        <div className="space-y-2">
          <Label>Assigned counselor</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Select value={assignee} onValueChange={setAssignee} disabled={busy !== null}>
                <SelectTrigger>
                  <SelectValue placeholder="Select counselor" />
                </SelectTrigger>
                <SelectContent>
                  {counselors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={saveAssignee}
              disabled={busy !== null || !assignee || assignee === currentAssigneeId}
            >
              {busy === "assign" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reassign"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
