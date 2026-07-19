"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Pencil, Check, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { updateExpectedClosingDate } from "@/actions/leads";

interface Props {
  leadId: string;
  /** Stored date as "YYYY-MM-DD", or null when unset. */
  value: string | null;
  /** True while the lead is not yet Admission Confirmed (date is mandatory). */
  required: boolean;
  canEdit: boolean;
}

export function ExpectedClosingDateRow({ leadId, value, required, canEdit }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  const display = value ? new Date(value).toLocaleDateString("en-IN") : null;

  const save = async () => {
    if (required && !date) {
      toast({ title: "Expected closing date is required until admission is confirmed", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await updateExpectedClosingDate(leadId, date || null);
      if (res?.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
        return;
      }
      toast({ title: "Expected closing date updated" });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-start gap-2 text-sm">
      <CalendarClock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <span className="text-muted-foreground min-w-24">Expected closing</span>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            required={required}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 w-40"
            autoFocus
          />
          <Button size="sm" className="h-8 px-2" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            onClick={() => { setDate(value ?? ""); setEditing(false); }}
            disabled={saving}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <span className="flex items-center gap-2">
          {display ? (
            <span className="font-medium">{display}</span>
          ) : (
            <span className={required ? "text-destructive font-medium" : "text-muted-foreground"}>
              {required ? "Required" : "Not set"}
            </span>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Edit expected closing date"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </span>
      )}
    </div>
  );
}
