"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface GeoValue {
  countryId: string | null;
  stateId: string | null;
  districtId: string | null;
}

interface Option {
  id: string;
  name: string;
}

const NONE = "__none__";

interface GeoPickerProps {
  value: GeoValue;
  onChange: (value: GeoValue) => void;
  /** Territory mode labels the empty option "Entire country / Entire state". */
  territoryMode?: boolean;
  disabled?: boolean;
}

/**
 * Cascading Country → State → District picker backed by the /api/geo endpoints.
 * A null stateId means "entire country"; a null districtId means "entire state".
 */
export function GeoPicker({ value, onChange, territoryMode, disabled }: GeoPickerProps) {
  const [countries, setCountries] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);

  // Load countries once.
  useEffect(() => {
    fetch("/api/geo/countries")
      .then((r) => r.json())
      .then((d) =>
        setCountries((d.countries ?? []).map((c: { id: string; countryName: string }) => ({ id: c.id, name: c.countryName })))
      )
      .catch(() => setCountries([]));
  }, []);

  // Load states when the country changes (empty when no country selected).
  const countryId = value.countryId;
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<Option[]> => {
      if (!countryId) return [];
      const r = await fetch(`/api/geo/states?countryId=${countryId}`);
      const d = await r.json();
      return (d.states ?? []).map((s: { id: string; stateName: string }) => ({ id: s.id, name: s.stateName }));
    };
    load()
      .then((opts) => !cancelled && setStates(opts))
      .catch(() => !cancelled && setStates([]));
    return () => {
      cancelled = true;
    };
  }, [countryId]);

  // Load districts when the state changes (empty when no state selected).
  const stateId = value.stateId;
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<Option[]> => {
      if (!stateId) return [];
      const r = await fetch(`/api/geo/districts?stateId=${stateId}`);
      const d = await r.json();
      return (d.districts ?? []).map((x: { id: string; districtName: string }) => ({ id: x.id, name: x.districtName }));
    };
    load()
      .then((opts) => !cancelled && setDistricts(opts))
      .catch(() => !cancelled && setDistricts([]));
    return () => {
      cancelled = true;
    };
  }, [stateId]);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label>Country *</Label>
        <Select
          value={value.countryId ?? undefined}
          onValueChange={(v) => onChange({ countryId: v, stateId: null, districtId: null })}
          disabled={disabled}
        >
          <SelectTrigger aria-required="true">
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>State</Label>
        <Select
          value={value.stateId ?? NONE}
          onValueChange={(v) =>
            onChange({ ...value, stateId: v === NONE ? null : v, districtId: null })
          }
          disabled={disabled || !value.countryId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{territoryMode ? "Entire country" : "—"}</SelectItem>
            {states.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>District</Label>
        <Select
          value={value.districtId ?? NONE}
          onValueChange={(v) => onChange({ ...value, districtId: v === NONE ? null : v })}
          disabled={disabled || !value.stateId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select district" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{territoryMode ? "Entire state" : "—"}</SelectItem>
            {districts.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
