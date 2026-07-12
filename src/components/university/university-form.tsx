"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  GraduationCap,
  ArrowLeft,
  Loader2,
  Globe,
  MapPin,
  Calendar,
  FileText,
} from "lucide-react";
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
import { createUniversity, updateUniversity } from "@/actions/universities";
import { toast } from "@/hooks/use-toast";
import type { UniversityStatus, UniversityType } from "@/types";

const schema = z.object({
  name: z.string().min(2, "Name required").max(200),
  establishmentYear: z.coerce
    .number()
    .int()
    .min(1000)
    .max(new Date().getFullYear()),
  location: z.string().min(1, "Location required"),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().min(1, "Country required"),
  website: z.string().url().optional().or(z.literal("")),
  universityType: z
    .enum(["PUBLIC", "PRIVATE", "DEEMED", "AUTONOMOUS", "INTERNATIONAL", ""])
    .optional(),
  accreditation: z.string().optional(),
  logoUrl: z.string().optional(),
  description: z.string().max(3000).optional(),
});

type FormData = z.infer<typeof schema>;

interface UniversityData {
  id: string;
  name: string;
  establishmentYear: number;
  location: string;
  city: string | null;
  state: string | null;
  country: string;
  website: string | null;
  universityType: UniversityType | null;
  accreditation: string | null;
  logoUrl: string | null;
  description: string | null;
  status: UniversityStatus;
}

const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia",
  "Germany", "France", "Singapore", "UAE", "New Zealand", "Ireland",
  "Netherlands", "Sweden", "Italy", "Spain", "Japan", "South Korea",
  "China", "Malaysia", "South Africa",
];

const TYPES: { value: UniversityType; label: string }[] = [
  { value: "PUBLIC", label: "Public" },
  { value: "PRIVATE", label: "Private" },
  { value: "DEEMED", label: "Deemed" },
  { value: "AUTONOMOUS", label: "Autonomous" },
  { value: "INTERNATIONAL", label: "International" },
];

export function UniversityForm({ university }: { university?: UniversityData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState(university?.country ?? "");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: university
      ? {
          name: university.name,
          establishmentYear: university.establishmentYear,
          location: university.location,
          city: university.city ?? "",
          state: university.state ?? "",
          country: university.country,
          website: university.website ?? "",
          universityType: university.universityType ?? "",
          accreditation: university.accreditation ?? "",
          logoUrl: university.logoUrl ?? "",
          description: university.description ?? "",
        }
      : { country: "", universityType: "" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const payload = {
      ...data,
      country: country || data.country,
      universityType: data.universityType || undefined,
    };

    const result = university
      ? await updateUniversity(university.id, payload)
      : await createUniversity(payload);

    if (result.error) {
      const msg = typeof result.error === "string" ? result.error : "Please fix validation errors";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } else {
      toast({ title: university ? "University updated" : "University created" });
      router.push(university ? `/admin/universities/${university.id}` : "/admin/universities");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href={university ? `/admin/universities/${university.id}` : "/admin/universities"}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {university ? "Edit University" : "Create University"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {university ? university.name : "Add a new university to the platform"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
            <GraduationCap className="w-4 h-4" />
            Basic Information
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>University Name *</Label>
              <Input className="mt-1" placeholder="e.g. Indian Institute of Technology" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <Label>Establishment Year *</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" className="pl-9" placeholder="1958" {...form.register("establishmentYear")} />
              </div>
              {form.formState.errors.establishmentYear && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.establishmentYear.message}</p>
              )}
            </div>
            <div>
              <Label>University Type</Label>
              <Select
                value={form.watch("universityType") ?? ""}
                onValueChange={(v) => form.setValue("universityType", v as FormData["universityType"])}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Website</Label>
              <div className="relative mt-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="https://university.edu" {...form.register("website")} />
              </div>
            </div>
            <div>
              <Label>Accreditation</Label>
              <Input className="mt-1" placeholder="e.g. NAAC A++, UGC" {...form.register("accreditation")} />
            </div>
          </div>
        </div>

        <div className="border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
            <MapPin className="w-4 h-4" />
            Location
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Location *</Label>
              <Input className="mt-1" placeholder="e.g. Powai, Mumbai" {...form.register("location")} />
              {form.formState.errors.location && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.location.message}</p>
              )}
            </div>
            <div>
              <Label>City</Label>
              <Input className="mt-1" placeholder="Mumbai" {...form.register("city")} />
            </div>
            <div>
              <Label>State / Province</Label>
              <Input className="mt-1" placeholder="Maharashtra" {...form.register("state")} />
            </div>
            <div className="sm:col-span-2">
              <Label>Country *</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="mt-1" aria-required="true">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.country && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.country.message}</p>
              )}
            </div>
          </div>
        </div>

        <div className="border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
            <FileText className="w-4 h-4" />
            About
          </h2>
          <div>
            <Label>Description</Label>
            <textarea
              rows={4}
              placeholder="Brief description (max 500 words)"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              {...form.register("description")}
            />
            <p className="text-xs text-muted-foreground mt-1">Maximum 3,000 characters</p>
          </div>
          <div>
            <Label>Logo URL</Label>
            <Input className="mt-1" placeholder="https://..." {...form.register("logoUrl")} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <Button type="button" variant="outline" asChild>
            <Link href={university ? `/admin/universities/${university.id}` : "/admin/universities"}>
              Cancel
            </Link>
          </Button>
          <Button type="submit" disabled={loading} className="gap-2 min-w-32">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {university ? "Save Changes" : "Create University"}
          </Button>
        </div>
      </form>
    </div>
  );
}
