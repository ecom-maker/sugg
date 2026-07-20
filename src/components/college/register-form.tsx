"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, User, Mail, Phone, Globe, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RegisterGeoPicker, type RegisterGeo } from "./register-geo-picker";

const schema = z.object({
  collegeName: z.string().min(3, "College name must be at least 3 characters"),
  website: z.string().optional(),
  officialEmail: z.string().email("Enter a valid email address"),
  contactPersonName: z.string().min(2, "Contact person name required"),
  contactPersonDesig: z.string().min(2, "Designation required"),
  mobileNumber: z.string().min(10, "Enter a valid mobile number").max(15),
  address: z.string().min(5, "Address required"),
  city: z.string().min(2, "City required"),
});

type FormData = z.infer<typeof schema>;

const EMPTY_GEO: RegisterGeo = {
  country: "India",
  state: "",
  district: "",
  countryId: null,
  stateId: null,
  districtId: null,
};

export function CollegeRegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [geo, setGeo] = useState<RegisterGeo>(EMPTY_GEO);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleSubmit = async (data: FormData) => {
    if (geo.country.trim().length < 2) {
      toast({ title: "Country required", description: "Please enter the country.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/colleges/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          country: geo.country.trim(),
          state: geo.state.trim() || undefined,
          countryId: geo.countryId ?? undefined,
          stateId: geo.stateId ?? undefined,
          districtId: geo.districtId ?? undefined,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast({ title: "Registration failed", description: result.error ?? "Something went wrong", variant: "destructive" });
        return;
      }

      toast({ title: "Registration submitted!", description: "Please check your email to verify your account." });
      router.push(`/college/verify?email=${encodeURIComponent(data.officialEmail)}&collegeId=${result.collegeId}`);
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const Field = ({ name, label, icon: Icon, placeholder, type = "text" }: {
    name: keyof FormData; label: string; icon: React.ComponentType<{ className?: string }>;
    placeholder: string; type?: string;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input id={name} type={type} placeholder={placeholder} className="pl-9" {...form.register(name)} />
      </div>
      {form.formState.errors[name] && (
        <p className="text-xs text-destructive">{form.formState.errors[name]?.message}</p>
      )}
    </div>
  );

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Institution Details */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Institution Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field name="collegeName" label="College Name *" icon={Building2} placeholder="e.g. ABC College" />
          </div>
          <div className="md:col-span-2">
            <Field name="officialEmail" label="Official Email Address *" icon={Mail} placeholder="admissions@college.edu" type="email" />
          </div>
          <Field name="website" label="Website (optional)" icon={Globe} placeholder="https://college.edu" />
          <Field name="mobileNumber" label="Contact Mobile *" icon={Phone} placeholder="+91 9876543210" />
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Person</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field name="contactPersonName" label="Contact Person Name *" icon={User} placeholder="Dr. Ramesh Kumar" />
          <Field name="contactPersonDesig" label="Designation *" icon={User} placeholder="Head of Admissions" />
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field name="address" label="Address *" icon={MapPin} placeholder="123 University Road, Sector 5" />
          </div>
          <RegisterGeoPicker value={geo} onChange={setGeo} />
          <Field name="city" label="City *" icon={MapPin} placeholder="Mumbai" />
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" className="w-full h-11" disabled={isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit Registration
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Your application will be reviewed by our team within 24–48 hours.
        </p>
      </div>
    </form>
  );
}
