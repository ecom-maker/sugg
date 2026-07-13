"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createSuggBranchLead } from "@/actions/leads";

export function AddLeadForm() {
  const router = useRouter();
  const [v, setV] = useState({
    name: "", mobile: "", email: "", city: "", interestedCourse: "",
    qualification: "", preferredCollege: "", budget: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (v.name.trim().length < 2 || v.mobile.trim().length < 10) {
      toast({ title: "Name and a valid mobile number are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(v).forEach(([k, val]) => fd.set(k, val));
      fd.set("source", "MANUAL_ENTRY");
      const res = await createSuggBranchLead(fd);
      if (res?.error) {
        const msg =
          typeof res.error === "object"
            ? Object.values(res.error).flat().filter(Boolean)[0] as string
            : "Could not add lead";
        toast({ title: "Error", description: msg, variant: "destructive" });
        return;
      }
      toast({ title: "Lead added" });
      router.push("/sugg-branch/leads");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Add Lead</h1>
        <p className="text-muted-foreground text-sm mt-1">Create a new student lead for your branch.</p>
      </div>

      <div className="rounded-lg border bg-card p-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Name *</Label>
          <Input required value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Student name" />
        </div>
        <div className="space-y-1.5">
          <Label>Mobile *</Label>
          <Input required value={v.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder="+91 98xxxxxxxx" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} placeholder="name@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label>City</Label>
          <Input value={v.city} onChange={(e) => set("city", e.target.value)} placeholder="City" />
        </div>
        <div className="space-y-1.5">
          <Label>Interested Course</Label>
          <Input value={v.interestedCourse} onChange={(e) => set("interestedCourse", e.target.value)} placeholder="e.g. B.Tech CSE" />
        </div>
        <div className="space-y-1.5">
          <Label>Qualification</Label>
          <Input value={v.qualification} onChange={(e) => set("qualification", e.target.value)} placeholder="e.g. 12th, Diploma" />
        </div>
        <div className="space-y-1.5">
          <Label>Preferred College</Label>
          <Input value={v.preferredCollege} onChange={(e) => set("preferredCollege", e.target.value)} placeholder="Preferred college" />
        </div>
        <div className="space-y-1.5">
          <Label>Budget</Label>
          <Input value={v.budget} onChange={(e) => set("budget", e.target.value)} placeholder="e.g. 200000" />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
        <Button type="submit" disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Add Lead
        </Button>
      </div>
    </form>
  );
}
