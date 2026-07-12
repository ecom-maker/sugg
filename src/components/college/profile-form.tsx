"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, Globe, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { updateCollegeProfile } from "@/actions/college-profile";
import { UniversitySelect } from "@/components/university/university-select";

const schema = z.object({
  name: z.string().min(3),
  website: z.string().url().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  contactPersonName: z.string().optional(),
  contactPersonDesig: z.string().optional(),
  contactPersonPhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  description: z.string().optional(),
  establishedYear: z.coerce.number().min(1800).max(new Date().getFullYear()).optional(),
});

type FormData = z.infer<typeof schema>;

interface CollegeData {
  id: string;
  name: string;
  website: string | null;
  officialEmail: string;
  contactPhone: string | null;
  contactPersonName: string | null;
  contactPersonDesig: string | null;
  contactPersonPhone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  description: string | null;
  establishedYear: number | null;
  universityId: string | null;
  status: string;
}

export function CollegeProfileForm({ college }: { college: CollegeData | null }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [universityId, setUniversityId] = useState(college?.universityId ?? "");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: college ? {
      name: college.name,
      website: college.website ?? "",
      contactPhone: college.contactPhone ?? "",
      contactPersonName: college.contactPersonName ?? "",
      contactPersonDesig: college.contactPersonDesig ?? "",
      contactPersonPhone: college.contactPersonPhone ?? "",
      address: college.address ?? "",
      city: college.city ?? "",
      state: college.state ?? "",
      country: college.country ?? "",
      pincode: college.pincode ?? "",
      description: college.description ?? "",
      establishedYear: college.establishedYear ?? undefined,
    } : {},
  });

  if (!college) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No college profile linked to your account.</p>
      </div>
    );
  }

  const handleSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const result = await updateCollegeProfile(college.id, {
        ...data,
        universityId: universityId || null,
      });
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Profile updated successfully" });
      router.refresh();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Status Banner */}
      <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${
        college.status === "APPROVED" ? "bg-green-50 text-green-700" :
        college.status === "PENDING" ? "bg-yellow-50 text-yellow-700" :
        "bg-red-50 text-red-700"
      }`}>
        <span className="font-medium">Status: {college.status}</span>
        {college.status === "PENDING" && " — Your profile is under review."}
        {college.status === "APPROVED" && " — Your profile is live."}
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Institution Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>College Name *</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" {...form.register("name")} />
            </div>
          </div>
          <div className="col-span-2 space-y-1.5">
            <UniversitySelect
              value={universityId}
              onChange={setUniversityId}
              allowCreate={false}
            />
            <p className="text-xs text-muted-foreground">
              Can&apos;t find your university? Contact Sugg admin to request addition.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Official Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9 bg-muted" value={college.officialEmail} readOnly />
            </div>
            <p className="text-xs text-muted-foreground">Contact admin to change official email</p>
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="+91 9876543210" {...form.register("contactPhone")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="https://..." {...form.register("website")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Established Year</Label>
            <Input type="number" placeholder="1985" {...form.register("establishedYear")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Brief description of your institution..."
            {...form.register("description")}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Person</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input placeholder="Dr. Ramesh Kumar" {...form.register("contactPersonName")} />
          </div>
          <div className="space-y-1.5">
            <Label>Designation</Label>
            <Input placeholder="Head of Admissions" {...form.register("contactPersonDesig")} />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="+91 9876543210" {...form.register("contactPersonPhone")} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Location</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Street address" {...form.register("address")} />
            </div>
          </div>
          <div className="space-y-1.5"><Label>City</Label><Input placeholder="Mumbai" {...form.register("city")} /></div>
          <div className="space-y-1.5"><Label>State</Label><Input placeholder="Maharashtra" {...form.register("state")} /></div>
          <div className="space-y-1.5"><Label>Country</Label><Input placeholder="India" {...form.register("country")} /></div>
          <div className="space-y-1.5"><Label>Pincode</Label><Input placeholder="400001" {...form.register("pincode")} /></div>
        </div>
      </div>

      <Button type="submit" className="w-full h-11" disabled={isLoading}>
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Save Profile
      </Button>
    </form>
  );
}
