"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, PauseCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "ARCHIVED";
type Action = "approve" | "reject" | "suspend";

interface Prompt {
  action: Action;
  title: string;
  label: string;
  placeholder: string;
  confirmLabel: string;
  variant: "default" | "destructive";
  required: boolean;
}

export function AgencyApprovalActions({
  agencyId,
  status,
}: {
  agencyId: string;
  status: Status;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [reason, setReason] = useState("");

  const call = async (action: Action, body?: object) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/agencies/${agencyId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Action failed", variant: "destructive" });
        return;
      }
      toast({
        title: `Agency ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "suspended"}`,
      });
      setPrompt(null);
      setReason("");
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const openPrompt = (p: Prompt) => {
    setReason("");
    setPrompt(p);
  };

  const submitPrompt = () => {
    if (!prompt) return;
    const trimmed = reason.trim();
    if (prompt.required && !trimmed) return;
    call(prompt.action, trimmed ? { reason: trimmed } : {});
  };

  // Reactivating a previously-approved agency (suspended) or re-approving a
  // rejected one requires a reason so the change is captured in history.
  const approveNeedsReason = status !== "PENDING";

  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <h2 className="font-semibold">Approval</h2>

      {prompt ? (
        <div className="space-y-2">
          <Label>
            {prompt.label}
            {prompt.required && <span className="text-destructive"> *</span>}
          </Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={prompt.placeholder}
            autoFocus
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPrompt(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={prompt.variant}
              onClick={submitPrompt}
              disabled={busy || (prompt.required && !reason.trim())}
              className="gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {prompt.confirmLabel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {status !== "APPROVED" && (
            <Button
              size="sm"
              disabled={busy}
              className="gap-2"
              onClick={() =>
                approveNeedsReason
                  ? openPrompt({
                      action: "approve",
                      title: "Approve agency",
                      label: status === "SUSPENDED" ? "Reason for reactivation" : "Reason for approval",
                      placeholder:
                        status === "SUSPENDED"
                          ? "Explain why this agency is being reactivated…"
                          : "Explain why this agency is being approved…",
                      confirmLabel: "Confirm approval",
                      variant: "default",
                      required: true,
                    })
                  : call("approve")
              }
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {status === "SUSPENDED" ? "Reactivate" : "Approve"}
            </Button>
          )}
          {status === "PENDING" && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              className="gap-2"
              onClick={() =>
                openPrompt({
                  action: "reject",
                  title: "Reject agency",
                  label: "Rejection reason",
                  placeholder: "Explain why this agency is being rejected…",
                  confirmLabel: "Confirm rejection",
                  variant: "destructive",
                  required: true,
                })
              }
            >
              <XCircle className="w-4 h-4" /> Reject
            </Button>
          )}
          {status === "APPROVED" && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              className="gap-2"
              onClick={() =>
                openPrompt({
                  action: "suspend",
                  title: "Suspend agency",
                  label: "Reason for suspension",
                  placeholder: "Explain why this agency is being suspended…",
                  confirmLabel: "Confirm suspension",
                  variant: "destructive",
                  required: true,
                })
              }
            >
              <PauseCircle className="w-4 h-4" /> Suspend
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Approving activates the owner (and manager) and creates a default Head Office branch.
      </p>
    </div>
  );
}
