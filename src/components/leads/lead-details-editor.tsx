"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Plus, X, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { updateLeadDetails } from "@/actions/leads";

const MAX_FEE = 5000000;
const FEE_STEP = 25000;

interface CatalogCourse { id: string; name: string; degreeType: string; }

function splitCsv(v: string | null): string[] {
  return (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

interface Props {
  leadId: string;
  budget: number | null;
  interestedCourse: string | null;
  preferredCollege: string | null;
}

export function LeadDetailsEditor({ leadId, budget, interestedCourse, preferredCollege }: Props) {
  const router = useRouter();
  const [fees, setFees] = useState<number>(budget ?? 0);
  const [courses, setCourses] = useState<string[]>(splitCsv(interestedCourse));
  const [courseInput, setCourseInput] = useState("");
  const [courseResults, setCourseResults] = useState<CatalogCourse[]>([]);
  const [courseOpen, setCourseOpen] = useState(false);
  const courseBoxRef = useRef<HTMLDivElement>(null);
  const [preferred, setPreferred] = useState<string[]>(splitCsv(preferredCollege));
  const [preferredInput, setPreferredInput] = useState("");
  const [saving, setSaving] = useState(false);

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

  const save = async () => {
    setSaving(true);
    try {
      const res = await updateLeadDetails(leadId, {
        budget: fees > 0 ? String(fees) : "",
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

  const pct = (fees / MAX_FEE) * 100;

  return (
    <div className="rounded-lg border bg-card p-5 space-y-5">
      <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Edit details</h2>

      {/* Max fees */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Max Fees</Label>
          <span className="text-sm font-medium">
            {fees > 0 ? `₹${fees.toLocaleString("en-IN")}${fees >= MAX_FEE ? " (Max.)" : ""}` : "Any"}
          </span>
        </div>
        <input
          type="range" min={0} max={MAX_FEE} step={FEE_STEP} value={fees}
          onChange={(e) => setFees(Number(e.target.value))}
          className="fee-slider w-full"
          style={{ background: `linear-gradient(to right, #4f46e5 ${pct}%, #e5e7eb ${pct}%)` }}
        />
      </div>

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

      <Button onClick={save} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save details
      </Button>
    </div>
  );
}
