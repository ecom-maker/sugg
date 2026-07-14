"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Save, MessageSquarePlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { updateLeadStatus, addLeadNote } from "@/actions/leads";
import type { LeadStatus } from "@/types";

const STATUSES: LeadStatus[] = [
  "NEW", "CONTACTED", "QUALIFIED", "COUNSELING_SCHEDULED", "COLLEGE_SHORTLISTED",
  "APPLICATION_SUBMITTED", "OFFER_RECEIVED", "ADMISSION_CONFIRMED", "LOST",
];

export function LeadActions({ leadId, currentStatus }: { leadId: string; currentStatus: LeadStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<LeadStatus>(currentStatus);
  const [note, setNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const saveStatus = async () => {
    if (status === currentStatus) {
      toast({ title: "Status unchanged" });
      return;
    }
    setSavingStatus(true);
    try {
      const res = await updateLeadStatus(leadId, status);
      if (res?.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
        return;
      }
      toast({ title: "Status updated" });
      router.refresh();
    } finally {
      setSavingStatus(false);
    }
  };

  const saveNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      const res = await addLeadNote(leadId, note.trim());
      if (res?.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
        return;
      }
      setNote("");
      toast({ title: "Note added" });
      router.refresh();
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="space-y-1.5">
        <Label>Update status</Label>
        <div className="flex gap-2">
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <Button onClick={saveStatus} disabled={savingStatus} className="gap-2 shrink-0">
            {savingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Add a note</Label>
        <textarea
          className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Log a call, follow-up, or observation…"
        />
        <Button variant="outline" onClick={saveNote} disabled={savingNote || !note.trim()} className="gap-2">
          {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquarePlus className="w-4 h-4" />}
          Add note
        </Button>
      </div>
    </div>
  );
}
