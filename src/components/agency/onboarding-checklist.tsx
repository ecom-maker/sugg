"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X, ListChecks, ArrowRight } from "lucide-react";

interface Step {
  key: string;
  label: string;
  done: boolean;
  href: string;
}

const DISMISS_KEY = "agency-onboarding-dismissed";

export function OnboardingChecklist() {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const isDismissed = localStorage.getItem(DISMISS_KEY) === "1";
    fetch("/api/agency/onboarding-status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setDismissed(isDismissed);
        if (d) setSteps(d.steps);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (dismissed || !steps) return null;

  const completed = steps.filter((s) => s.done).length;
  // Auto-hide once everything is done.
  if (completed === steps.length) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold">Finish setting up your agency</h2>
            <p className="text-xs text-muted-foreground">
              {completed} of {steps.length} steps complete
            </p>
          </div>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${(completed / steps.length) * 100}%` }} />
      </div>

      <ul className="space-y-1">
        {steps.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
                s.done ? "text-muted-foreground" : "hover:bg-muted"
              }`}
            >
              {s.done ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span className={s.done ? "line-through" : ""}>{s.label}</span>
              {!s.done && <ArrowRight className="w-3.5 h-3.5 ml-auto text-muted-foreground" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
