"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Loader2, Users, Building2, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Item {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}
interface Results {
  leads: Item[];
  colleges: Item[];
  applications: Item[];
}

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close and reset when navigating to a result.
  useEffect(() => {
    setOpen(false);
    setQ("");
    setRes(null);
  }, [pathname]);

  // Debounced search.
  useEffect(() => {
    if (q.trim().length < 2) {
      setRes(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          setRes(d);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const groups = res
    ? [
        { label: "Students & Leads", icon: Users, items: res.leads ?? [] },
        { label: "Colleges", icon: Building2, items: res.colleges ?? [] },
        { label: "Applications", icon: FileText, items: res.applications ?? [] },
      ].filter((g) => g.items.length > 0)
    : [];
  const showEmpty = res !== null && groups.length === 0 && q.trim().length >= 2;

  return (
    <div className="flex-1 max-w-md hidden sm:block relative" ref={boxRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => res && setOpen(true)}
          placeholder="Search students, colleges, applications..."
          className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && res !== null && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg max-h-96 overflow-auto py-1">
          {showEmpty ? (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">No results for &ldquo;{q}&rdquo;</p>
          ) : (
            groups.map((g) => {
              const Icon = g.icon;
              return (
                <div key={g.label}>
                  <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Icon className="w-3 h-3" />
                    {g.label}
                  </p>
                  {g.items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-accent"
                    >
                      <span className="font-medium truncate">{item.title}</span>
                      {item.subtitle && <span className="text-xs text-muted-foreground truncate shrink-0">{item.subtitle}</span>}
                    </Link>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
