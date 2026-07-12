"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, PauseCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "ARCHIVED";

export function AgencyApprovalActions({
  agencyId,
  status,
}: {
  agencyId: string;
  status: Status;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "approve" | "reject" | "suspend">(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  const call = async (action: "approve" | "reject" | "suspend", body?: object) => {
    setBusy(action);
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
      toast({ title: `Agency ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "suspended"}` });
      setShowReject(false);
      setReason("");
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <h2 className="font-semibold">Approval</h2>

      {showReject ? (
        <div className="space-y-2">
          <Label>Rejection reason</Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Explain why this agency is being rejected…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowReject(false)} disabled={busy === "reject"}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => call("reject", { reason: reason.trim() || undefined })}
              disabled={busy === "reject"}
              className="gap-2"
            >
              {busy === "reject" && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm rejection
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {status !== "APPROVED" && (
            <Button size="sm" onClick={() => call("approve")} disabled={busy !== null} className="gap-2">
              {busy === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve
            </Button>
          )}
          {status === "PENDING" && (
            <Button size="sm" variant="outline" onClick={() => setShowReject(true)} disabled={busy !== null} className="gap-2">
              <XCircle className="w-4 h-4" /> Reject
            </Button>
          )}
          {status === "APPROVED" && (
            <Button size="sm" variant="outline" onClick={() => call("suspend")} disabled={busy !== null} className="gap-2">
              {busy === "suspend" ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />}
              Suspend
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
