"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Globe, Mail, Phone, MapPin, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { updateAgencyProfile } from "@/actions/agency-profile";

export interface AgencyProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  isActive: boolean;
}

const emptyForm = (a: AgencyProfileData) => ({
  name: a.name,
  phone: a.phone ?? "",
  website: a.website ?? "",
  address: a.address ?? "",
  city: a.city ?? "",
  state: a.state ?? "",
  country: a.country ?? "",
});

export function AgencyProfileForm({ agency, canEdit }: { agency: AgencyProfileData; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState(emptyForm(agency));

  const set = <K extends keyof ReturnType<typeof emptyForm>>(k: K, v: string) =>
    setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (f.name.trim().length < 2) {
      toast({ title: "Agency name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await updateAgencyProfile(agency.id, f);
      if (res?.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
        return;
      }
      toast({ title: "Profile updated" });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setF(emptyForm(agency));
    setEditing(false);
  };

  const location = [agency.city, agency.country].filter(Boolean).join(", ");

  if (editing) {
    return (
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Edit profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Agency Name *</Label>
            <Input required value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Agency name" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Login Email</Label>
            <Input value={agency.email} readOnly disabled />
            <p className="text-xs text-muted-foreground">The login email can&apos;t be changed here — ask a Super Admin.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98xxxxxxxx" />
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Address</Label>
            <Input value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="Street address" />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="City" />
          </div>
          <div className="space-y-1.5">
            <Label>State</Label>
            <Input value={f.state} onChange={(e) => set("state", e.target.value)} placeholder="State" />
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Input value={f.country} onChange={(e) => set("country", e.target.value)} placeholder="Country" />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={cancel} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-purple-50 flex items-center justify-center">
            <Briefcase className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{agency.name}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${agency.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {agency.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5" /> Edit profile
          </Button>
        )}
      </div>

      <div className="grid gap-3 pt-4 border-t text-sm">
        <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-muted-foreground" />{agency.email}</div>
        {agency.phone && <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-muted-foreground" />{agency.phone}</div>}
        {agency.website && (
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <a href={agency.website} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{agency.website}</a>
          </div>
        )}
        {location && <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-muted-foreground" />{location}</div>}
      </div>
    </div>
  );
}
