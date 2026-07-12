"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function AgencyVerifyForm({ agencyId }: { agencyId: string }) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const handleVerify = async () => {
    if (otp.length < 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/agencies/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyId, token: otp }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Invalid code", description: result.error ?? "Please try again", variant: "destructive" });
        return;
      }
      setIsVerified(true);
      toast({ title: "Verified!", description: "Your registration is now under review." });
      setTimeout(() => router.push("/agency/pending"), 1500);
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const res = await fetch("/api/agencies/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyId }),
      });
      const result = await res.json();
      toast({
        title: "Code resent",
        description: result.devOtp ? `Dev code: ${result.devOtp}` : "Check the owner's email/mobile.",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <div className="text-center py-6">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <p className="font-medium">Verified — redirecting…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="Enter 6-digit code"
        className="text-center text-lg tracking-[0.4em]"
        inputMode="numeric"
      />
      <Button onClick={handleVerify} disabled={isLoading} className="w-full gap-2">
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        Verify
      </Button>
      <button
        onClick={handleResend}
        disabled={isResending}
        className="text-sm text-primary hover:underline w-full text-center"
      >
        {isResending ? "Resending…" : "Resend code"}
      </button>
    </div>
  );
}
