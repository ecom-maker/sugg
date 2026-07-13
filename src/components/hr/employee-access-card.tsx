"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, KeyRound, ShieldCheck, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CAPABILITY_CATALOG } from "@/lib/capabilities";
import { provisionEmployeeLogin, setEmployeeCapabilities } from "@/actions/employees";

interface Props {
  employeeId: string;
  hasEmail: boolean;
  login: { email: string; role: string; capabilities: string[] } | null;
}

export function EmployeeAccessCard({ employeeId, hasEmail, login }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string[]>(login?.capabilities ?? []);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggle = (key: string) =>
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  const provision = async () => {
    setBusy(true);
    try {
      const res = await provisionEmployeeLogin(employeeId);
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
        return;
      }
      setTempPassword(res.password ?? null);
      toast({ title: login ? "Password reset" : "Login provisioned" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await setEmployeeCapabilities(employeeId, selected);
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
        return;
      }
      toast({ title: "Access updated" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const copyPassword = async () => {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
        <ShieldCheck className="w-4 h-4" /> Access &amp; permissions
      </h2>

      {!login ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This employee has no login yet. Provision one to grant access. Their base role is
            derived from their employee type; the toggles below add access on top of it.
          </p>
          <Button onClick={provision} disabled={busy || !hasEmail} className="gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Provision login
          </Button>
          {!hasEmail && (
            <p className="text-xs text-amber-600">
              Add an official or personal email to this employee first.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Login:</span>
            <span className="font-medium">{login.email}</span>
            <Badge variant="secondary">{login.role.replace(/_/g, " ")}</Badge>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Additional access</p>
            {CAPABILITY_CATALOG.map((cap) => (
              <label key={cap.key} className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  checked={selected.includes(cap.key)}
                  onChange={() => toggle(cap.key)}
                />
                <span>
                  <span className="text-sm font-medium">{cap.label}</span>
                  <span className="block text-xs text-muted-foreground">{cap.description}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={save} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save access
            </Button>
            <Button variant="outline" onClick={provision} disabled={busy} className="gap-2">
              <KeyRound className="w-4 h-4" /> Reset password
            </Button>
          </div>
        </div>
      )}

      {tempPassword && (
        <div className="rounded-md bg-muted p-3 text-sm space-y-1">
          <p className="font-medium">Temporary password (shown once)</p>
          <div className="flex items-center gap-2">
            <code className="font-mono">{tempPassword}</code>
            <Button size="sm" variant="ghost" onClick={copyPassword} className="h-7 gap-1">
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
