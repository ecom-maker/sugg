"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CatalogCourse {
  id: string;
  name: string;
  degreeType: string;
  field: string | null;
  duration: string | null;
}

export function CourseCatalogPicker({
  onSelect,
}: {
  onSelect: (course: { name: string; degreeType: string; duration: string | null }) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced search.
  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/course-catalog?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          setResults(d.courses ?? []);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (c: CatalogCourse) => {
    onSelect({ name: c.name, degreeType: c.degreeType, duration: c.duration });
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="space-y-1.5" ref={boxRef}>
      <Label className="flex items-center gap-2">
        <BookOpen className="w-4 h-4" /> Pick from course catalog
      </Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search India courses (e.g. B.Tech, MBBS, B.Com)…"
          className="pl-9"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}

        {open && results.length > 0 && (
          <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-md border bg-popover shadow-md">
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c)}
                className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center justify-between gap-3"
              >
                <span className="min-w-0">
                  <span className="font-medium block truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.field}</span>
                </span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                  {c.degreeType}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Not listed? Just fill in the details manually below.
      </p>
    </div>
  );
}
