"use client";

import { Label } from "@/components/ui/label";

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

/** A min–max fee range selector (two handles on one track). */
export function FeeRangeSlider({
  minValue,
  maxValue,
  onChange,
  cap,
  step,
  label = "Fee Range",
}: {
  minValue: number;
  maxValue: number;
  onChange: (min: number, max: number) => void;
  cap: number;
  step: number;
  label?: string;
}) {
  const minPct = (minValue / cap) * 100;
  const maxPct = (maxValue / cap) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="mb-0">{label}</Label>
        <span className="text-sm font-medium">
          {fmt(minValue)} – {maxValue >= cap ? "Max" : fmt(maxValue)}
        </span>
      </div>
      <div className="range-dual">
        <div className="range-dual-track" />
        <div className="range-dual-fill" style={{ left: `${minPct}%`, width: `${Math.max(0, maxPct - minPct)}%` }} />
        <input
          type="range"
          min={0}
          max={cap}
          step={step}
          value={minValue}
          onChange={(e) => onChange(Math.min(Number(e.target.value), maxValue), maxValue)}
          aria-label="Minimum fee"
        />
        <input
          type="range"
          min={0}
          max={cap}
          step={step}
          value={maxValue}
          onChange={(e) => onChange(minValue, Math.max(Number(e.target.value), minValue))}
          aria-label="Maximum fee"
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>₹0</span>
        <span>Max.</span>
      </div>
    </div>
  );
}
