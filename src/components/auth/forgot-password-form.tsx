"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    // Always show success (do not reveal whether the email exists).
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="text-center py-4 space-y-3">
        <MailCheck className="w-12 h-12 text-green-600 mx-auto" />
        <p className="font-medium">Check your email</p>
        <p className="text-sm text-muted-foreground">
          If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
          Open it to set a new password.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11"
        />
      </div>
      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Send reset link
      </Button>
    </form>
  );
}
