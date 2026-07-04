"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ArrowLeft,
  Loader2,
  Globe,
  Mail,
  Phone,
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
import { createCollege } from "@/actions/colleges";
import { toast } from "@/hooks/use-toast";

const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Singapore",
  "UAE",
  "New Zealand",
  "Ireland",
  "Netherlands",
  "Sweden",
  "Italy",
  "Spain",
  "Japan",
  "South Korea",
  "China",
  "Malaysia",
  "South Africa",
];

export function CollegeNewForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [country, setCountry] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    if (country) formData.set("country", country);

    const result = await createCollege(formData);

    if (result.error && typeof result.error === "object") {
      setErrors(result.error as Record<string, string[]>);
      toast({
        title: "Validation Error",
        description: "Please fix the errors below.",
        variant: "destructive",
      });
    } else if (result.success) {
      toast({
        title: "College created",
        description: "The college has been created successfully.",
      });
      router.push("/admin/colleges");
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }

    setLoading(false);
  }

  const fieldError = (field: string) =>
    errors[field]?.[0] ? (
      <p className="text-xs text-red-500 mt-1">{errors[field][0]}</p>
    ) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/admin/colleges">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Add New College</h1>
            <p className="text-sm text-muted-foreground">
              Fill in the details to register a new college
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
            <Building2 className="w-4 h-4" />
            Basic Information
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">
                College Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Maharaja Institute of Technology"
                className="mt-1"
                required
              />
              {fieldError("name")}
            </div>

            <div>
              <Label htmlFor="officialEmail">
                Official Email <span className="text-red-500">*</span>
              </Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="officialEmail"
                  name="officialEmail"
                  type="email"
                  placeholder="admin@college.edu"
                  className="pl-9"
                  required
                />
              </div>
              {fieldError("officialEmail")}
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <div className="relative mt-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="website"
                  name="website"
                  type="url"
                  placeholder="https://college.edu"
                  className="pl-9"
                />
              </div>
              {fieldError("website")}
            </div>

            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  placeholder="+91 98765 43210"
                  className="pl-9"
                />
              </div>
              {fieldError("contactPhone")}
            </div>

            <div>
              <Label htmlFor="establishedYear">Established Year</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="establishedYear"
                  name="establishedYear"
                  type="number"
                  placeholder="e.g. 1995"
                  min="1800"
                  max={new Date().getFullYear()}
                  className="pl-9"
                />
              </div>
              {fieldError("establishedYear")}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
            <MapPin className="w-4 h-4" />
            Location
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                placeholder="Street address, building, etc."
                className="mt-1"
              />
              {fieldError("address")}
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                placeholder="e.g. Mumbai"
                className="mt-1"
              />
              {fieldError("city")}
            </div>

            <div>
              <Label htmlFor="state">State / Province</Label>
              <Input
                id="state"
                name="state"
                placeholder="e.g. Maharashtra"
                className="mt-1"
              />
              {fieldError("state")}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="country">
                Country <span className="text-red-500">*</span>
              </Label>
              <Select value={country} onValueChange={setCountry} required>
                <SelectTrigger id="country" className="mt-1">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("country")}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
            <FileText className="w-4 h-4" />
            About
          </h2>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Brief description of the college, its programs, campus, etc."
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
            {fieldError("description")}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/colleges">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading} className="gap-2 min-w-32">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4" />
                Create College
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
