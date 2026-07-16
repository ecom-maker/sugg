"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, MessageSquarePlus, CalendarClock, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { updateLeadStatus, addLeadNote } from "@/actions/leads";
import type { LeadStatus } from "@/types";

const STATUSES: LeadStatus[] = [
  "NEW", "CONTACTED", "QUALIFIED", "COUNSELING_SCHEDULED", "COLLEGE_SHORTLISTED",
  "APPLICATION_SUBMITTED", "OFFER_RECEIVED", "ADMISSION_CONFIRMED", "LOST",
];
const FOLLOWUP_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "COUNSELING_SCHEDULED"];

export function LeadActions({
  leadId,
  currentStatus,
  shortlistedCollege,
  preferredColleges = [],
}: {
  leadId: string;
  currentStatus: LeadStatus;
  shortlistedCollege?: string | null;
  preferredColleges?: string[];
}) {
  const router = useRouter();
  // Shortlisted-college options come from this lead's preferred colleges.
  const shortlistOptions = Array.from(
    new Set([shortlistedCollege, ...preferredColleges].map((c) => c?.trim()).filter(Boolean) as string[])
  );
  const [status, setStatus] = useState<LeadStatus>(currentStatus);
  const [followUpAt, setFollowUpAt] = useState("");
  const [shortlisted, setShortlisted] = useState(shortlistedCollege || preferredColleges[0] || "");
  const [note, setNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const wantsFollowUp = FOLLOWUP_STATUSES.includes(status);
  const wantsShortlist = status === "COLLEGE_SHORTLISTED";

  const saveStatus = async () => {
    if (wantsShortlist && !shortlisted.trim()) {
      toast({ title: "Enter the shortlisted college name", variant: "destructive" });
      return;
    }
    setSavingStatus(true);
    try {
      const res = await updateLeadStatus(leadId, status, undefined, undefined, {
        // Convert the naive datetime-local value to a real UTC instant using the
        // browser's timezone, so overdue/scheduling compares correctly.
        followUpAt: wantsFollowUp && followUpAt ? new Date(followUpAt).toISOString() : null,
        shortlistedCollege: wantsShortlist ? shortlisted.trim() : null,
      });
      if (res?.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
        return;
      }
      toast({
        title: "Status updated",
        description: wantsFollowUp && followUpAt ? "Follow-up added to the calendar." : undefined,
      });
      setFollowUpAt("");
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
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as LeadStatus)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {wantsFollowUp && (
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" /> Follow-up date &amp; time</Label>
          <Input type="datetime-local" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} className="max-w-xs" />
          <p className="text-xs text-muted-foreground">Adds a follow-up to the calendar for this lead&apos;s counsellor.</p>
        </div>
      )}

      {wantsShortlist && (
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Shortlisted college</Label>
          {shortlistOptions.length > 0 ? (
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={shortlisted}
              onChange={(e) => setShortlisted(e.target.value)}
            >
              {shortlistOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            <Input value={shortlisted} onChange={(e) => setShortlisted(e.target.value)} placeholder="College name" />
          )}
          <p className="text-xs text-muted-foreground">
            {shortlistOptions.length > 0
              ? "Pick from this lead's preferred colleges. Saved on the student profile."
              : "Add preferred colleges above to pick from, or type a name. Saved on the student profile."}
          </p>
        </div>
      )}

      <Button onClick={saveStatus} disabled={savingStatus} className="gap-2">
        {savingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save status
      </Button>

      <div className="space-y-1.5 pt-2 border-t">
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
