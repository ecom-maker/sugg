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
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createAgencyLead } from "@/actions/agency-leads";

interface BranchOption {
  id: string;
  branchName: string;
}

export function AgencyLeadForm({ branches }: { branches?: BranchOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [branchId, setBranchId] = useState<string>("");

  const err = (f: string) =>
    errors[f]?.[0] ? <p className="text-xs text-destructive mt-1">{errors[f][0]}</p> : null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const fd = new FormData(e.currentTarget);
    if (branchId) fd.set("branchId", branchId);

    const result = await createAgencyLead(fd);
    if (result.error && typeof result.error === "object") {
      setErrors(result.error as Record<string, string[]>);
      toast({ title: "Please fix the errors", variant: "destructive" });
    } else if (result.error) {
      toast({ title: "Error", description: String(result.error), variant: "destructive" });
    } else if (result.success) {
      toast({ title: "Lead created" });
      router.push(`/agency/leads/${result.leadId}`);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">New Lead</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create a student lead. It is checked for duplicates and assigned to you by default.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Student</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Name *</Label>
            <Input name="name" required className="mt-1" />
            {err("name")}
          </div>
          <div>
            <Label>Mobile *</Label>
            <Input name="mobile" required placeholder="+91 …" className="mt-1" />
            {err("mobile")}
          </div>
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" className="mt-1" />
          </div>
          <div>
            <Label>City</Label>
            <Input name="city" className="mt-1" />
          </div>
          <div>
            <Label>Interested Course</Label>
            <Input name="interestedCourse" placeholder="e.g. MBA" className="mt-1" />
          </div>
          <div>
            <Label>Preferred Country</Label>
            <Input name="preferredCountry" className="mt-1" />
          </div>
          <div>
            <Label>Qualification</Label>
            <Input name="qualification" className="mt-1" />
          </div>
          <div>
            <Label>Budget</Label>
            <Input name="budget" type="number" className="mt-1" />
          </div>
          {branches && branches.length > 0 && (
            <div className="sm:col-span-2">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a branch (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.branchName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Create Lead
        </Button>
      </div>
    </form>
  );
}
