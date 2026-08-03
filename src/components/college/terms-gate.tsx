"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { acceptCollegeTerms } from "@/actions/college-terms";
import { createClient } from "@/lib/supabase/client";

/**
 * Blocking Terms & Conditions acceptance modal shown to a college account
 * that has not yet accepted. Rendered from the dashboard layout, so it appears
 * on every login until the College accepts (or signs out).
 */
export function CollegeTermsGate({ collegeName }: { collegeName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const onAccept = async () => {
    setLoading(true);
    try {
      const res = await acceptCollegeTerms();
      if (res.error) {
        toast({ title: "Could not record acceptance", description: res.error, variant: "destructive" });
        return;
      }
      toast({ title: "Terms & Conditions accepted", description: "Thank you — you're all set." });
      router.refresh();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-gate-title"
        className="w-full max-w-lg rounded-xl border bg-background shadow-2xl"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 id="terms-gate-title" className="text-lg font-semibold leading-tight">
                Terms &amp; Conditions
              </h2>
              <p className="text-xs text-muted-foreground">Please review and accept to continue using Sugg.</p>
            </div>
          </div>

          <p className="text-sm leading-relaxed">
            By clicking <span className="font-semibold">Accept</span>, I agree I am the authorised person for{" "}
            <span className="font-semibold">&ldquo;{collegeName}&rdquo;</span> and we accept the Terms &amp; Conditions
            by Sugg.
          </p>

          <a
            href="/college-terms"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="w-4 h-4" /> View full Terms &amp; Conditions
          </a>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onSignOut}
              disabled={signingOut || loading}
              className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
            <Button onClick={onAccept} disabled={loading || signingOut} className="ml-auto gap-2 min-w-28">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
