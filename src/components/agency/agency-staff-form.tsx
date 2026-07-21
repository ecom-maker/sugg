"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus, Copy, Check, KeyRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createAgencyStaff } from "@/actions/agency-staff";
import { OWNER_ASSIGNABLE_ROLES, AGENCY_ROLE_LABELS } from "@/lib/agency-roles";

const NONE_BRANCH = "__none__";

interface Props {
  branchOptions: { value: string; label: string }[];
}

export function AgencyStaffForm({ branchOptions }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>(OWNER_ASSIGNABLE_ROLES[0]);
  const [branchId, setBranchId] = useState<string>(NONE_BRANCH);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      toast({ title: "Enter the staff member's name", variant: "destructive" });
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    if (password && password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const res = await createAgencyStaff({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        role,
        branchId: branchId === NONE_BRANCH ? null : branchId,
        password: password || undefined,
      });
      if (res.error) {
        toast({ title: "Could not add staff", description: res.error, variant: "destructive" });
        return;
      }
      if (res.loginError) {
        toast({ title: "Staff added, but login failed", description: res.loginError, variant: "destructive" });
        router.push("/agency/staff");
        router.refresh();
        return;
      }
      if (res.password) {
        // Temp password generated — show it once.
        setTempPassword(res.password);
        toast({
          title: "Staff added",
          description: res.emailSent ? "A password reset email was also sent." : undefined,
        });
      } else {
        toast({ title: "Staff added and login created" });
        router.push("/agency/staff");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const copyCreds = () => {
    navigator.clipboard.writeText(`Email: ${email.trim()}\nPassword: ${tempPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (tempPassword) {
    return (
      <div className="max-w-xl space-y-4">
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-muted-foreground" /> Login created
          </h2>
          <p className="text-xs text-muted-foreground">
            Share these credentials securely — the password is shown only once.
          </p>
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium break-all">{email.trim()}</p>
            <p className="font-mono text-xs mt-1">{tempPassword}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={copyCreds}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copy
          </Button>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setTempPassword(null); setFullName(""); setEmail(""); setPhone(""); setPassword(""); setBranchId(NONE_BRANCH); }}>
            Add another
          </Button>
          <Button onClick={() => { router.push("/agency/staff"); router.refresh(); }}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-5">
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Full Name *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Riya Sharma" />
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxxxxxxx" />
          </div>
          <div className="space-y-1.5">
            <Label>Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OWNER_ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{AGENCY_ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_BRANCH}>Unassigned</SelectItem>
                {branchOptions.map((b) => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Login Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to auto-generate" autoComplete="new-password" />
            <p className="text-xs text-muted-foreground">Leave blank and we&apos;ll generate a temporary password (shown once).</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={busy}>Cancel</Button>
        <Button type="submit" disabled={busy} className="gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Add Staff
        </Button>
      </div>
    </form>
  );
}
