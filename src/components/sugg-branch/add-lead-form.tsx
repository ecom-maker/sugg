"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Plus, X, GraduationCap, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createSuggBranchLead } from "@/actions/leads";

interface Rec {
  courseId: string;
  collegeName: string;
  location: string;
  courseName: string;
  degreeType: string;
  fee: number | null;
}

function money(n: number | null) {
  if (n == null) return "Fee N/A";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function AddLeadForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [qualification, setQualification] = useState("");
  const [budget, setBudget] = useState("");
  const [courses, setCourses] = useState<string[]>([]);
  const [courseInput, setCourseInput] = useState("");
  const [preferredCollege, setPreferredCollege] = useState("");
  const [loading, setLoading] = useState(false);

  const [recs, setRecs] = useState<Rec[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);

  const addCourse = () => {
    const c = courseInput.trim();
    if (c && !courses.includes(c)) setCourses((s) => [...s, c]);
    setCourseInput("");
  };
  const removeCourse = (c: string) => setCourses((s) => s.filter((x) => x !== c));

  // Fetch recommended colleges as interested courses / budget change (debounced).
  useEffect(() => {
    if (courses.length === 0) {
      setRecs([]);
      return;
    }
    let cancelled = false;
    setRecsLoading(true);
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ courses: courses.join(",") });
        if (budget) params.set("budget", budget);
        const r = await fetch(`/api/sugg-branch/recommended-colleges?${params}`);
        const d = await r.json();
        if (!cancelled) setRecs(d.colleges ?? []);
      } catch {
        if (!cancelled) setRecs([]);
      } finally {
        if (!cancelled) setRecsLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [courses, budget]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || mobile.trim().length < 10) {
      toast({ title: "Name and a valid mobile number are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("mobile", mobile.trim());
      fd.set("email", email.trim());
      fd.set("city", city.trim());
      fd.set("qualification", qualification.trim());
      fd.set("budget", budget.trim());
      fd.set("interestedCourse", courses.join(", "));
      fd.set("preferredCollege", preferredCollege.trim());
      fd.set("source", "MANUAL_ENTRY");
      const res = await createSuggBranchLead(fd);
      if (res?.error) {
        const msg =
          typeof res.error === "object"
            ? (Object.values(res.error).flat().filter(Boolean)[0] as string)
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
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Add Lead</h1>
        <p className="text-muted-foreground text-sm mt-1">Create a new student lead for your branch.</p>
      </div>

      <div className="rounded-lg border bg-card p-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Name *</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Student name" />
        </div>
        <div className="space-y-1.5">
          <Label>Mobile *</Label>
          <Input required value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91 98xxxxxxxx" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label>City</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
        </div>
        <div className="space-y-1.5">
          <Label>Qualification</Label>
          <Input value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g. 12th, Diploma" />
        </div>
        <div className="space-y-1.5">
          <Label>Budget (₹)</Label>
          <Input value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="e.g. 200000" />
        </div>

        {/* Interested courses — multi */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Interested Courses</Label>
          <div className="flex gap-2">
            <Input
              value={courseInput}
              onChange={(e) => setCourseInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addCourse();
                }
              }}
              placeholder="Type a course and press Enter (e.g. B.Tech CSE)"
            />
            <Button type="button" variant="outline" onClick={addCourse} className="gap-1 shrink-0">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
          {courses.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {courses.map((c) => (
                <Badge key={c} variant="secondary" className="gap-1 pr-1">
                  {c}
                  <button type="button" onClick={() => removeCourse(c)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Preferred College</Label>
          <Input value={preferredCollege} onChange={(e) => setPreferredCollege(e.target.value)} placeholder="Preferred college" />
        </div>
      </div>

      {/* Recommended colleges */}
      {courses.length > 0 && (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Recommended Colleges</h2>
            {recsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground">
            Colleges offering the interested course{courses.length > 1 ? "s" : ""}
            {budget ? ` with fees within ±15% of ₹${Number(budget).toLocaleString("en-IN")}` : ""}. Click to set as preferred.
          </p>
          {recs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">
              {recsLoading ? "Searching…" : "No matching colleges found. Try a different course name or budget."}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {recs.map((r) => (
                <button
                  type="button"
                  key={r.courseId}
                  onClick={() => setPreferredCollege(r.collegeName)}
                  className={`text-left rounded-md border p-3 hover:border-primary/50 hover:bg-muted/30 transition-colors ${
                    preferredCollege === r.collegeName ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <p className="font-medium text-sm">{r.collegeName}</p>
                  <p className="text-xs text-muted-foreground">{r.courseName} · {r.degreeType.replace(/_/g, " ")}</p>
                  <div className="flex items-center justify-between mt-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3" />{r.location || "—"}
                    </span>
                    <span className="font-medium">{money(r.fee)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
