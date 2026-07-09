"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, GraduationCap, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface UniversityOption {
  id: string;
  name: string;
  establishmentYear: number;
  location: string;
  city?: string | null;
  country: string;
  status: string;
}

interface UniversitySelectProps {
  value?: string;
  onChange: (universityId: string) => void;
  allowCreate?: boolean;
  disabled?: boolean;
  error?: string;
}

export function UniversitySelect({
  value,
  onChange,
  allowCreate = false,
  disabled = false,
  error,
}: UniversitySelectProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<UniversityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<UniversityOption | null>(null);

  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    fetch(`/api/universities/${value}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.university) {
          setSelected({
            id: data.university.id,
            name: data.university.name,
            establishmentYear: data.university.establishmentYear,
            location: data.university.location,
            city: data.university.city,
            country: data.university.country,
            status: data.university.status,
          });
        }
      })
      .catch(() => {});
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ status: "ACTIVE", limit: "20" });
        if (query) params.set("q", query);
        const res = await fetch(`/api/universities?${params}`);
        const data = await res.json();
        setOptions(data.universities ?? []);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (uni: UniversityOption) => {
    setSelected(uni);
    onChange(uni.id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="space-y-1.5">
      <Label>University</Label>

      {selected ? (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{selected.name}</p>
            <p className="text-xs text-muted-foreground">
              Est. {selected.establishmentYear} · {selected.location}
              {selected.city ? `, ${selected.city}` : ""} · {selected.country}
            </p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                onChange("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Change
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search universities by name, city, or country..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            disabled={disabled}
            className="pl-9"
          />

          {open && !disabled && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border bg-popover shadow-lg max-h-60 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Searching...
                </div>
              ) : options.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  <p>No universities found</p>
                  {allowCreate && (
                    <Link
                      href="/admin/universities/new"
                      className="inline-flex items-center gap-1 mt-2 text-primary hover:underline text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      Create new university
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {options.map((uni) => (
                    <button
                      key={uni.id}
                      type="button"
                      onClick={() => handleSelect(uni)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 hover:bg-muted/60 transition-colors border-b last:border-0",
                        value === uni.id && "bg-muted/40"
                      )}
                    >
                      <p className="font-medium text-sm">{uni.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Est. {uni.establishmentYear} · {uni.location}
                        {uni.city ? `, ${uni.city}` : ""} · {uni.country}
                      </p>
                    </button>
                  ))}
                  {allowCreate && (
                    <Link
                      href="/admin/universities/new"
                      className="flex items-center gap-2 px-4 py-2.5 text-xs text-primary hover:bg-muted/60 border-t"
                    >
                      <Plus className="w-3 h-3" />
                      Create new university
                    </Link>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      {!allowCreate && !selected && (
        <p className="text-xs text-muted-foreground">
          Select the parent university this college belongs to.
        </p>
      )}
    </div>
  );
}
