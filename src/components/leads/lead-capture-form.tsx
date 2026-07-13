"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, X, GraduationCap, MapPin, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CatalogCourse {
  id: string;
  name: string;
  degreeType: string;
}

interface Rec {
  courseId: string;
  collegeName: string;
  location: string;
  courseName: string;
  degreeType: string;
  fee: number | null;
}

interface Props {
  /** Server action that creates the lead from FormData. */
  action: (formData: FormData) => Promise<{ error?: unknown; success?: boolean; leadId?: string } | void>;
  /** Where to go after a successful create. */
  redirectTo: string;
}

function money(n: number | null) {
  if (n == null) return "Fee N/A";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function LeadCaptureForm({ action, redirectTo }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [qualification, setQualification] = useState("");
  const [budget, setBudget] = useState("");
  const [courses, setCourses] = useState<string[]>([]);
  const [courseInput, setCourseInput] = useState("");
  const [courseResults, setCourseResults] = useState<CatalogCourse[]>([]);
  const [courseOpen, setCourseOpen] = useState(false);
  const [courseLoading, setCourseLoading] = useState(false);
  const courseBoxRef = useRef<HTMLDivElement>(null);
  const [preferredCollege, setPreferredCollege] = useState("");
  const [loading, setLoading] = useState(false);

  const [recs, setRecs] = useState<Rec[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);

  const addCourse = (nameRaw: string) => {
    const c = nameRaw.trim();
    if (c && !courses.includes(c)) setCourses((s) => [...s, c]);
    setCourseInput("");
    setCourseResults([]);
    setCourseOpen(false);
  };
  const removeCourse = (c: string) => setCourses((s) => s.filter((x) => x !== c));

  // Autocomplete interested courses from the standardised course catalog.
  useEffect(() => {
    if (courseInput.trim().length < 1) {
      setCourseResults([]);
      return;
    }
    let cancelled = false;
    setCourseLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/course-catalog?q=${encodeURIComponent(courseInput)}`)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          setCourseResults(d.courses ?? []);
          setCourseOpen(true);
        })
        .catch(() => {})
        .finally(() => !cancelled && setCourseLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [courseInput]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (courseBoxRef.current && !courseBoxRef.current.contains(e.target as Node)) setCourseOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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
      const res = await action(fd);
      if (res && "error" in res && res.error) {
        const msg =
          typeof res.error === "object"
            ? (Object.values(res.error as Record<string, unknown>).flat().filter(Boolean)[0] as string)
            : String(res.error);
        toast({ title: "Error", description: msg ?? "Could not add lead", variant: "destructive" });
        return;
      }
      toast({ title: "Lead added" });
      router.push(redirectTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Add Lead</h1>
        <p className="text-muted-foreground text-sm mt-1">Create a new student lead.</p>
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

        <div className="space-y-1.5 sm:col-span-2" ref={courseBoxRef}>
          <Label>Interested Courses</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={courseInput}
              onChange={(e) => setCourseInput(e.target.value)}
              onFocus={() => courseResults.length > 0 && setCourseOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (courseResults[0]) addCourse(courseResults[0].name);
                }
              }}
              placeholder="Search the standard course list…"
            />
            {courseLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
            {courseOpen && courseResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md max-h-64 overflow-auto">
                {courseResults.map((c) => {
                  const already = courses.includes(c.name);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      disabled={already}
                      onClick={() => addCourse(c.name)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between disabled:opacity-50"
                    >
                      <span>{c.name}</span>
                      <span className="text-xs text-muted-foreground">{already ? "Added" : c.degreeType}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Select from the standard course list to keep courses consistent.</p>
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
