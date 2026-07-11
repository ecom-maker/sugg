"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, Loader2, MapPin, UserRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { GeoPicker, type GeoValue } from "@/components/sugg-branches/geo-picker";

const NONE_ID = "__none__";
const NATIONAL_ID_TYPES = [
  "Passport",
  "Aadhaar",
  "Emirates ID",
  "PAN Card",
  "Driving License",
  "National ID",
  "Other",
];

export interface AgencyFormData {
  id?: string;
  name: string;
  email: string;
  phone: string | null;
  website: string | null;
  registrationNumber: string | null;
  ownerName: string | null;
  ownerMobile: string | null;
  nationalIdType: string | null;
  nationalIdNumber: string | null;
  headquarters: string | null;
  address: string | null;
  city: string | null;
  countryId: string | null;
  stateId: string | null;
  districtId: string | null;
  isActive?: boolean;
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
}

export function AgencyForm({ agency }: { agency?: AgencyFormData }) {
  const router = useRouter();
  const isEdit = Boolean(agency?.id);

  const [name, setName] = useState(agency?.name ?? "");
  const [email, setEmail] = useState(agency?.email ?? "");
  const [phone, setPhone] = useState(agency?.phone ?? "");
  const [website, setWebsite] = useState(agency?.website ?? "");
  const [registrationNumber, setRegistrationNumber] = useState(agency?.registrationNumber ?? "");
  const [ownerName, setOwnerName] = useState(agency?.ownerName ?? "");
  const [ownerMobile, setOwnerMobile] = useState(agency?.ownerMobile ?? "");
  const [nationalIdType, setNationalIdType] = useState<string | null>(agency?.nationalIdType ?? null);
  const [nationalIdNumber, setNationalIdNumber] = useState(agency?.nationalIdNumber ?? "");
  const [headquarters, setHeadquarters] = useState(agency?.headquarters ?? "");
  const [address, setAddress] = useState(agency?.address ?? "");
  const [city, setCity] = useState(agency?.city ?? "");
  const [approvalStatus, setApprovalStatus] = useState(agency?.approvalStatus ?? "PENDING");
  const [geo, setGeo] = useState<GeoValue>({
    countryId: agency?.countryId ?? null,
    stateId: agency?.stateId ?? null,
    districtId: agency?.districtId ?? null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast({ title: "Agency name is required", variant: "destructive" });
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      toast({ title: "A valid email is required", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        website: website.trim() || null,
        registrationNumber: registrationNumber.trim() || null,
        ownerName: ownerName.trim() || null,
        ownerMobile: ownerMobile.trim() || null,
        nationalIdType: nationalIdType || null,
        nationalIdNumber: nationalIdNumber.trim() || null,
        headquarters: headquarters.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        countryId: geo.countryId,
        stateId: geo.stateId,
        districtId: geo.districtId,
        ...(isEdit ? { approvalStatus } : {}),
      };

      const res = await fetch(
        isEdit ? `/api/admin/agencies/${agency!.id}` : "/api/admin/agencies",
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

      if (!isEdit && data.coveringSuggBranch) {
        toast({
          title: "Agency created",
          description: `Routed to ${data.coveringSuggBranch.branchName} by territory.`,
        });
      } else if (!isEdit) {
        toast({
          title: "Agency created",
          description: "No Sugg Branch covers this territory — added to the unassigned queue.",
        });
      } else {
        toast({ title: "Agency updated" });
      }

      const id = data.agency?.id ?? agency?.id;
      router.push(id ? `/admin/agencies/${id}` : "/admin/agencies");
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
        <h1 className="text-2xl font-bold">{isEdit ? "Edit Agency" : "New Agency"}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isEdit
            ? "Update the agency's profile and status."
            : "The covering Sugg Branch is resolved automatically from the agency's location."}
        </p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Briefcase className="w-4 h-4" /> Agency information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Agency Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. EduVision Consultants" />
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@agency.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxxxxxx" />
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://agency.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Registration Number</Label>
            <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="Optional" />
          </div>
          {isEdit && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Approval Status</Label>
              <Select value={approvalStatus} onValueChange={(v) => setApprovalStatus(v as typeof approvalStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <UserRound className="w-4 h-4" /> Owner &amp; identity
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Owner Name</Label>
            <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Full name of the agency owner" />
          </div>
          <div className="space-y-1.5">
            <Label>Owner Mobile Number</Label>
            <Input value={ownerMobile} onChange={(e) => setOwnerMobile(e.target.value)} placeholder="+91 98xxxxxxx" />
          </div>
          <div className="space-y-1.5">
            <Label>National ID Type</Label>
            <Select
              value={nationalIdType ?? NONE_ID}
              onValueChange={(v) => setNationalIdType(v === NONE_ID ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select ID type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_ID}>—</SelectItem>
                {NATIONAL_ID_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>National ID Number</Label>
            <Input
              value={nationalIdNumber}
              onChange={(e) => setNationalIdNumber(e.target.value)}
              placeholder="ID document number"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Location
        </h2>
        <p className="text-xs text-muted-foreground">
          Location determines the covering Sugg Branch. On create it is resolved automatically; you
          can also map it manually from the agency page.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Headquarters</Label>
            <Input value={headquarters} onChange={(e) => setHeadquarters(e.target.value)} placeholder="City / region" />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" />
          </div>
        </div>
        <GeoPicker value={geo} onChange={setGeo} />
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Save changes" : "Create Agency"}
        </Button>
      </div>
    </form>
  );
}
