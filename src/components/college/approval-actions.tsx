"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { CollegeStatus } from "@/types";

export function CollegeApprovalActions({
  collegeId,
  collegeName,
  currentStatus,
}: {
  collegeId: string;
  collegeName: string;
  currentStatus: CollegeStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const approve = async () => {
    setLoading("approve");
    try {
      const res = await fetch(`/api/admin/colleges/${collegeId}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "College Approved", description: `${collegeName} is now active.` });
      router.refresh();
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const reject = async () => {
    const reason = window.prompt(`Rejection reason for ${collegeName}:`);
    if (reason === null) return;
    setLoading("reject");
    try {
      const res = await fetch(`/api/admin/colleges/${collegeId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "Does not meet requirements" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "College Rejected" });
      router.refresh();
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {(currentStatus === "PENDING" || currentStatus === "SUSPENDED") && (
        <Button
          size="sm"
          variant="outline"
          onClick={approve}
          disabled={loading !== null}
          className="text-green-700 border-green-200 hover:bg-green-50"
        >
          {loading === "approve" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
          {currentStatus === "SUSPENDED" ? "Reactivate" : "Approve"}
        </Button>
      )}
      {currentStatus === "PENDING" && (
        <Button
          size="sm"
          variant="outline"
          onClick={reject}
          disabled={loading !== null}
          className="text-red-700 border-red-200 hover:bg-red-50"
        >
          {loading === "reject" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
          Reject
        </Button>
      )}
      {currentStatus === "APPROVED" && (
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            setLoading("suspend");
            const res = await fetch(`/api/admin/colleges/${collegeId}/reject`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason: "Suspended by admin" }),
            });
            if (res.ok) {
              toast({ title: "College Suspended" });
              router.refresh();
            }
            setLoading(null);
          }}
          disabled={loading !== null}
        >
          {loading === "suspend" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Clock className="w-3 h-3 mr-1" />}
          Suspend
        </Button>
      )}
    </div>
  );
}
