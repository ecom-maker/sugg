"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2, MapPin, UserCog } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { GeoPicker, type GeoValue } from "@/components/sugg-branches/geo-picker";
import { ManagerSelect } from "@/components/sugg-branches/manager-select";

export interface SuggBranchFormData {
  id?: string;
  branchName: string;
  branchCode: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  countryId: string | null;
  stateId: string | null;
  districtId: string | null;
  managerId: string | null;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}

export function SuggBranchForm({ branch }: { branch?: SuggBranchFormData }) {
  const router = useRouter();
  const isEdit = Boolean(branch?.id);

  const [branchName, setBranchName] = useState(branch?.branchName ?? "");
  const [branchCode, setBranchCode] = useState(branch?.branchCode ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [phone, setPhone] = useState(branch?.phone ?? "");
  const [email, setEmail] = useState(branch?.email ?? "");
  const [managerId, setManagerId] = useState<string | null>(branch?.managerId ?? null);
  const [geo, setGeo] = useState<GeoValue>({
    countryId: branch?.countryId ?? null,
    stateId: branch?.stateId ?? null,
    districtId: branch?.districtId ?? null,
  });
  const [isLoading, setIsLoading] = useState(false);

  // On create, preview the auto-generated code as the location changes. Codes
  // are never regenerated on edit — an existing branch keeps its code.
  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    const load = async (): Promise<string> => {
      if (!geo.countryId) return "";
      const params = new URLSearchParams({ countryId: geo.countryId });
      if (geo.stateId) params.set("stateId", geo.stateId);
      if (geo.districtId) params.set("districtId", geo.districtId);
      const r = await fetch(`/api/admin/sugg-branches/next-code?${params}`);
      const d = await r.json();
      return d.code ?? "";
    };
    load()
      .then((code) => !cancelled && setBranchCode(code))
      .catch(() => !cancelled && setBranchCode(""));
    return () => {
      cancelled = true;
    };
  }, [isEdit, geo.countryId, geo.stateId, geo.districtId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (branchName.trim().length < 2) {
      toast({ title: "Branch name is required", variant: "destructive" });
      return;
    }
    if (!geo.countryId) {
      toast({ title: "Country is required", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        branchName: branchName.trim(),
        // Create: server auto-generates the code. Edit: keep the existing code.
        ...(isEdit ? { branchCode: branchCode.trim() } : {}),
        address: address.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        countryId: geo.countryId,
        stateId: geo.stateId,
        districtId: geo.districtId,
        managerId,
      };

      const res = await fetch(
        isEdit ? `/api/admin/sugg-branches/${branch!.id}` : "/api/admin/sugg-branches",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Request failed", variant: "destructive" });
        return;
      }

      toast({ title: isEdit ? "Sugg Branch updated" : "Sugg Branch created" });
      const id = data.branch?.id ?? branch?.id;
      router.push(id ? `/admin/sugg-branches/${id}` : "/admin/sugg-branches");
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{isEdit ? "Edit Sugg Branch" : "New Sugg Branch"}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          A Sugg Branch is a Sugg-operated regional office that manages partner agencies in its territory.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Building2 className="w-4 h-4" /> Basic information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Branch Name *</Label>
            <Input required value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="e.g. Sugg Kerala" />
          </div>
          <div className="space-y-1.5">
            <Label>Branch Code</Label>
            <Input
              value={branchCode}
              readOnly
              disabled
              placeholder={isEdit ? "" : "Auto-generated from location"}
              className="font-mono"
            />
            {!isEdit && (
              <p className="text-xs text-muted-foreground">
                Auto-generated from state &amp; district (e.g. SUGG-KL-PKD-1).
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 484 400 0100" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kerala@sugg.in" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Office location
        </h2>
        <p className="text-xs text-muted-foreground">
          This is the branch&apos;s own location. Coverage is defined separately by Territories after creation.
        </p>
        <GeoPicker value={geo} onChange={setGeo} />
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <UserCog className="w-4 h-4" /> Manager
        </h2>
        <p className="text-xs text-muted-foreground">
          The assigned user is promoted to the Sugg Branch Manager role.
        </p>
        <ManagerSelect value={managerId} onChange={setManagerId} />
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Save changes" : "Create Sugg Branch"}
        </Button>
      </div>
    </form>
  );
}
