"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, Copy, Check, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Cred {
  email: string;
  role: string;
  password?: string;
  error?: string;
}

export function AgencyLoginCredentials({ agencyId }: { agencyId: string }) {
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState<Cred[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setCreds(null);
    try {
      const res = await fetch(`/api/admin/agencies/${agencyId}/provision-login`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Could not create login", description: data.error ?? "Failed", variant: "destructive" });
        if (Array.isArray(data.credentials)) setCreds(data.credentials);
        return;
      }
      setCreds(data.credentials);
      toast({ title: "Login credentials generated" });
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const copy = (c: Cred) => {
    const text = `Email: ${c.email}\nPassword: ${c.password}`;
    navigator.clipboard.writeText(text);
    setCopied(c.email);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <h2 className="font-semibold flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-muted-foreground" /> Login credentials
      </h2>
      <p className="text-xs text-muted-foreground">
        Create a temporary password for the agency owner (and manager) so they can sign in at
        /login. Share it securely — it is shown only once.
      </p>

      {creds && creds.length > 0 && (
        <div className="space-y-2">
          {creds.map((c) =>
            c.password ? (
              <div key={c.email} className="rounded-md border bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{c.role.replace("AGENCY_", "")}</span>
                  <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => copy(c)}>
                    {copied === c.email ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </Button>
                </div>
                <p className="font-medium break-all">{c.email}</p>
                <p className="font-mono text-xs mt-1">{c.password}</p>
              </div>
            ) : (
              <div key={c.email} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{c.email}: {c.error}</span>
              </div>
            )
          )}
        </div>
      )}

      <Button size="sm" variant="outline" onClick={generate} disabled={busy} className="gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
        {creds ? "Regenerate password" : "Generate login credentials"}
      </Button>
    </div>
  );
}
