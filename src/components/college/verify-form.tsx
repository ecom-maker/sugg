"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function CollegeVerifyForm({ email, collegeId }: { email: string; collegeId: string }) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const handleVerify = async () => {
    if (otp.length < 6) {
      toast({ title: "Enter 6-digit code", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/colleges/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collegeId, token: otp }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast({ title: "Invalid code", description: result.error ?? "Please try again", variant: "destructive" });
        return;
      }

      setIsVerified(true);
      toast({ title: "Email verified!", description: "Your registration is under review." });
      setTimeout(() => router.push("/college/pending"), 2000);
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await fetch("/api/colleges/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collegeId }),
      });
      toast({ title: "Code resent!", description: `Check ${email}` });
    } catch {
      toast({ title: "Failed to resend", variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <div className="text-center space-y-4 py-4">
        <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
        <p className="font-semibold text-lg">Email Verified!</p>
        <p className="text-sm text-muted-foreground">Redirecting to your pending status page…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium">Verification Code</label>
        <Input
          placeholder="Enter 6-digit code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="text-center text-xl tracking-[0.5em] h-12 font-mono"
          maxLength={6}
        />
      </div>

      <Button onClick={handleVerify} className="w-full h-11" disabled={isLoading || otp.length < 6}>
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Verify Email
      </Button>

      <div className="text-center">
        <span className="text-sm text-muted-foreground">Didn&apos;t receive the code? </span>
        <button
          onClick={handleResend}
          disabled={isResending}
          className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
        >
          {isResending ? "Sending…" : "Resend"}
        </button>
      </div>
    </div>
  );
}
