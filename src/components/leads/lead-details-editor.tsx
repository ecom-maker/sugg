"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Plus, X, Search, GraduationCap, MapPin, ExternalLink, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { updateLeadDetails } from "@/actions/leads";
import { FeeRangeSlider } from "@/components/ui/fee-range-slider";

const MAX_FEE = 5000000;
const FEE_STEP = 25000;

interface CatalogCourse { id: string; name: string; degreeType: string; }
interface Rec {
  courseId: string;
  collegeId: string;
  collegeName: string;
  location: string;
  courseName: string;
  degreeType: string;
  fee: number | null;
}

function splitCsv(v: string | null): string[] {
  return (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

interface Props {
  leadId: string;
  budget: number | null;
  budgetMin: number | null;
  interestedCourse: string | null;
  preferredCollege: string | null;
}

export function LeadDetailsEditor({ leadId, budget, budgetMin, interestedCourse, preferredCollege }: Props) {
  const router = useRouter();
  const [feeMin, setFeeMin] = useState<number>(budgetMin ?? 0);
  const [feeMax, setFeeMax] = useState<number>(budget ?? MAX_FEE);
  const [courses, setCourses] = useState<string[]>(splitCsv(interestedCourse));
  const [courseInput, setCourseInput] = useState("");
  const [courseResults, setCourseResults] = useState<CatalogCourse[]>([]);
  const [courseOpen, setCourseOpen] = useState(false);
  const courseBoxRef = useRef<HTMLDivElement>(null);
  const [preferred, setPreferred] = useState<string[]>(splitCsv(preferredCollege));
  const [preferredInput, setPreferredInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);

  const togglePreferred = (name: string) =>
    setPreferred((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));

  const addCourse = (name: string) => {
    const c = name.trim();
    if (c && !courses.includes(c)) setCourses((s) => [...s, c]);
    setCourseInput("");
    setCourseResults([]);
    setCourseOpen(false);
  };
  const addPreferred = () => {
    const c = preferredInput.trim();
    if (c && !preferred.includes(c)) setPreferred((s) => [...s, c]);
    setPreferredInput("");
  };

  useEffect(() => {
    if (courseInput.trim().length < 1) { setCourseResults([]); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`/api/course-catalog?q=${encodeURIComponent(courseInput)}`)
        .then((r) => r.json())
        .then((d) => { if (!cancelled) { setCourseResults(d.courses ?? []); setCourseOpen(true); } })
        .catch(() => {});
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [courseInput]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (courseBoxRef.current && !courseBoxRef.current.contains(e.target as Node)) setCourseOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Recommended colleges for the current interested courses + max fees.
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
        if (feeMin > 0) params.set("min", String(feeMin));
        if (feeMax < MAX_FEE) params.set("max", String(feeMax));
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
  }, [courses, feeMin, feeMax]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await updateLeadDetails(leadId, {
        budget: feeMax > 0 && feeMax < MAX_FEE ? String(feeMax) : "",
        budgetMin: feeMin > 0 ? String(feeMin) : "",
        interestedCourse: courses.join(", "),
        preferredCollege: preferred.join(", "),
      });
      if (res?.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
        return;
      }
      toast({ title: "Details updated" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-5">
      <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Edit details</h2>

      {/* Fee range */}
      <FeeRangeSlider
        minValue={feeMin}
        maxValue={feeMax}
        onChange={(mn, mx) => { setFeeMin(mn); setFeeMax(mx); }}
        cap={MAX_FEE}
        step={FEE_STEP}
        label="Fee Range"
      />

      {/* Interested courses */}
      <div className="space-y-1.5" ref={courseBoxRef}>
        <Label>Interested Courses</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={courseInput}
            onChange={(e) => setCourseInput(e.target.value)}
            onFocus={() => courseResults.length > 0 && setCourseOpen(true)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (courseResults[0]) addCourse(courseResults[0].name); } }}
            placeholder="Search the standard course list…"
          />
          {courseOpen && courseResults.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md max-h-56 overflow-auto">
              {courseResults.map((c) => (
                <button type="button" key={c.id} disabled={courses.includes(c.name)} onClick={() => addCourse(c.name)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between disabled:opacity-50">
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground">{courses.includes(c.name) ? "Added" : c.degreeType}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {courses.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {courses.map((c) => (
              <Badge key={c} variant="secondary" className="gap-1 pr-1">{c}
                <button type="button" onClick={() => setCourses((s) => s.filter((x) => x !== c))} className="hover:text-destructive"><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Preferred colleges */}
      <div className="space-y-1.5">
        <Label>Preferred Colleges</Label>
        <div className="flex gap-2">
          <Input value={preferredInput} onChange={(e) => setPreferredInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPreferred(); } }}
            placeholder="Add a college" />
          <Button type="button" variant="outline" onClick={addPreferred} className="gap-1 shrink-0"><Plus className="w-4 h-4" /> Add</Button>
        </div>
        {preferred.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {preferred.map((c) => (
              <Badge key={c} variant="secondary" className="gap-1 pr-1">{c}
                <button type="button" onClick={() => setPreferred((s) => s.filter((x) => x !== c))} className="hover:text-destructive"><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Recommended colleges from the interested courses */}
      {courses.length > 0 && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
            <Label className="mb-0">Recommended Colleges</Label>
            {recsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground">
            Colleges offering the interested course{courses.length > 1 ? "s" : ""}
            {feeMin > 0 || feeMax < MAX_FEE ? ` with fees ₹${feeMin.toLocaleString("en-IN")}–${feeMax >= MAX_FEE ? "Max" : `₹${feeMax.toLocaleString("en-IN")}`}` : ""}. Add one to Preferred Colleges.
          </p>
          {recs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">
              {recsLoading ? "Searching…" : "No matching colleges found."}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {recs.map((r) => {
                const selected = preferred.includes(r.collegeName);
                return (
                  <div key={r.courseId} className={`rounded-md border p-3 ${selected ? "border-primary bg-primary/5" : ""}`}>
                    <p className="font-medium text-sm">{r.collegeName}</p>
                    <p className="text-xs text-muted-foreground">{r.courseName} · {r.degreeType.replace(/_/g, " ")}</p>
                    <div className="flex items-center justify-between mt-1.5 text-xs">
                      <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" />{r.location || "—"}</span>
                      <span className="font-medium">{r.fee != null ? `₹${r.fee.toLocaleString("en-IN")}` : "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5">
                      <Button type="button" size="sm" variant={selected ? "default" : "outline"} onClick={() => togglePreferred(r.collegeName)} className="h-7 gap-1 text-xs">
                        {selected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        {selected ? "Preferred" : "Add to preferred"}
                      </Button>
                      <a href={`/colleges/${r.collegeId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="w-3 h-3" /> View
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Button onClick={save} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save details
      </Button>
    </div>
  );
}
