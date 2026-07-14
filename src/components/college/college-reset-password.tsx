"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { resetCollegeLogin } from "@/actions/college-login";

export function CollegeResetPassword({ collegeId, loginEmail }: { collegeId: string; loginEmail: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = async () => {
    if (password && password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await resetCollegeLogin(collegeId, { password: password || undefined });
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
        return;
      }
      setTempPassword(res.password ?? null);
      setPassword("");
      toast({ title: password ? "Password updated" : "Temporary password generated" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
        <KeyRound className="w-4 h-4" /> College login
      </h2>
      <p className="text-xs text-muted-foreground">
        Login email: <span className="font-medium text-foreground">{loginEmail ?? "—"}</span>. Enter a new password, or
        leave it blank to generate a temporary one (shown once).
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label>New Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 chars (or blank to auto-generate)"
            autoComplete="new-password"
            className="w-72"
          />
        </div>
        <Button onClick={reset} disabled={busy} className="gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          Reset password
        </Button>
      </div>

      {tempPassword && (
        <div className="rounded-md bg-muted p-3 text-sm space-y-1">
          <p className="font-medium">Temporary password (shown once)</p>
          <div className="flex items-center gap-2">
            <code className="font-mono">{tempPassword}</code>
            <Button size="sm" variant="ghost" onClick={copy} className="h-7 gap-1">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Share it securely; it won&apos;t be shown again.</p>
        </div>
      )}
    </div>
  );
}
