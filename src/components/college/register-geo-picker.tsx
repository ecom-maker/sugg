"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

export interface RegisterGeo {
  country: string;
  state: string;
  district: string;
  countryId: string | null;
  stateId: string | null;
  districtId: string | null;
}

interface Opt {
  id: string;
  name: string;
}

const norm = (s: string) => s.trim().toLowerCase();
const matchId = (opts: Opt[], name: string) =>
  opts.find((o) => norm(o.name) === norm(name))?.id ?? null;

interface RegisterGeoPickerProps {
  value: RegisterGeo;
  onChange: (value: RegisterGeo) => void;
}

/**
 * Cascading Country → State → District picker for the public college register
 * form. Backed by the (public) /api/geo endpoints. Uses native datalists so the
 * fields autocomplete as you type; selecting a country populates its states and
 * a state populates its districts. Reports both the place names (stored as
 * strings on the college) and the resolved geo ids (stored as FKs).
 */
export function RegisterGeoPicker({ value, onChange }: RegisterGeoPickerProps) {
  const [countries, setCountries] = useState<Opt[]>([]);
  const [states, setStates] = useState<Opt[]>([]);
  const [districts, setDistricts] = useState<Opt[]>([]);

  // Load countries once.
  useEffect(() => {
    fetch("/api/geo/countries")
      .then((r) => r.json())
      .then((d) =>
        setCountries(
          (d.countries ?? []).map((c: { id: string; countryName: string }) => ({ id: c.id, name: c.countryName }))
        )
      )
      .catch(() => setCountries([]));
  }, []);

  // Load states whenever the resolved country id changes.
  const countryId = value.countryId;
  useEffect(() => {
    if (!countryId) {
      setStates([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/geo/states?countryId=${countryId}`)
      .then((r) => r.json())
      .then((d) =>
        !cancelled &&
        setStates((d.states ?? []).map((s: { id: string; stateName: string }) => ({ id: s.id, name: s.stateName })))
      )
      .catch(() => !cancelled && setStates([]));
    return () => {
      cancelled = true;
    };
  }, [countryId]);

  // Load districts whenever the resolved state id changes.
  const stateId = value.stateId;
  useEffect(() => {
    if (!stateId) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/geo/districts?stateId=${stateId}`)
      .then((r) => r.json())
      .then((d) =>
        !cancelled &&
        setDistricts(
          (d.districts ?? []).map((x: { id: string; districtName: string }) => ({ id: x.id, name: x.districtName }))
        )
      )
      .catch(() => !cancelled && setDistricts([]));
    return () => {
      cancelled = true;
    };
  }, [stateId]);

  // Resolve a pre-filled country name (e.g. the default "India") to its id once
  // the country list arrives, so its states can autopopulate.
  useEffect(() => {
    if (value.countryId || !value.country || countries.length === 0) return;
    const id = matchId(countries, value.country);
    if (id) onChange({ ...value, countryId: id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries]);

  const setCountry = (name: string) =>
    onChange({
      country: name,
      countryId: matchId(countries, name),
      state: "",
      stateId: null,
      district: "",
      districtId: null,
    });

  const setState = (name: string) =>
    onChange({ ...value, state: name, stateId: matchId(states, name), district: "", districtId: null });

  const setDistrict = (name: string) =>
    onChange({ ...value, district: name, districtId: matchId(districts, name) });

  const GeoField = ({
    id,
    label,
    placeholder,
    val,
    onValue,
    options,
  }: {
    id: string;
    label: string;
    placeholder: string;
    val: string;
    onValue: (v: string) => void;
    options: Opt[];
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id={id}
          list={`${id}-list`}
          autoComplete="off"
          placeholder={placeholder}
          className="pl-9"
          value={val}
          onChange={(e) => onValue(e.target.value)}
        />
        <datalist id={`${id}-list`}>
          {options.map((o) => (
            <option key={o.id} value={o.name} />
          ))}
        </datalist>
      </div>
    </div>
  );

  return (
    <>
      <GeoField
        id="reg-country"
        label="Country *"
        placeholder="India"
        val={value.country}
        onValue={setCountry}
        options={countries}
      />
      <GeoField
        id="reg-state"
        label="State"
        placeholder="Kerala"
        val={value.state}
        onValue={setState}
        options={states}
      />
      <GeoField
        id="reg-district"
        label="District"
        placeholder="Ernakulam"
        val={value.district}
        onValue={setDistrict}
        options={districts}
      />
    </>
  );
}
