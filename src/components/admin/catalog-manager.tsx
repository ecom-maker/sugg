"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Loader2, BookOpen, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createCatalogCourse } from "@/actions/course-catalog";

interface Course {
  id: string;
  name: string;
  degreeType: string;
  field: string | null;
  duration: string | null;
}

const DEGREE_TYPES = ["DIPLOMA", "BACHELOR", "MASTER", "DOCTORATE", "CERTIFICATE", "OTHER"];
const emptyForm = { name: "", degreeType: "BACHELOR", field: "", duration: "" };

export function CatalogManager({ initial }: { initial: Course[] }) {
  const [list, setList] = useState<Course[]>(initial);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? list.filter((c) => c.name.toLowerCase().includes(q) || (c.field ?? "").toLowerCase().includes(q))
    : list;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      toast({ title: "Course name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await createCatalogCourse(form);
      if (res.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
        return;
      }
      if (res.course) setList((l) => [res.course, ...l]);
      setForm(emptyForm);
      setShowAdd(false);
      toast({ title: "Course added to catalog" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filtered.length}{q ? ` of ${list.length}` : ""} courses
        </p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 w-56" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search courses…" />
          </div>
          <Button onClick={() => setShowAdd((s) => !s)} className="gap-2">
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAdd ? "Close" : "Add Course"}
          </Button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={submit} className="rounded-lg border bg-card p-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Course Name *</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bachelor of Technology (Computer Science)" />
          </div>
          <div className="space-y-1.5">
            <Label>Degree Type *</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.degreeType}
              onChange={(e) => setForm({ ...form, degreeType: e.target.value })}
            >
              {DEGREE_TYPES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Field</Label>
            <Input value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} placeholder="e.g. Engineering, Medical, Commerce" />
          </div>
          <div className="space-y-1.5">
            <Label>Typical Duration</Label>
            <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 4 years" />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Course
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setForm(emptyForm); }}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Course</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Degree</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Field</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Duration</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-16 text-center text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                {q ? "No courses match your search." : "No courses in the catalog yet."}
              </td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3"><Badge variant="secondary">{c.degreeType}</Badge></td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{c.field ?? "—"}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.duration ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
