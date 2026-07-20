"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, UserRound, UserCog, ClipboardCheck, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { GeoPicker, type GeoValue } from "@/components/sugg-branches/geo-picker";

const SPECIALIZATIONS: { value: string; label: string }[] = [
  { value: "DOMESTIC_ADMISSIONS", label: "Domestic Admissions" },
  { value: "STUDY_ABROAD", label: "Study Abroad" },
  { value: "MEDICAL", label: "Medical" },
  { value: "ENGINEERING", label: "Engineering" },
  { value: "MANAGEMENT", label: "Management" },
  { value: "OTHER", label: "Other" },
];

const STEPS = [
  { title: "Agency", icon: Building2 },
  { title: "Owner", icon: UserRound },
  { title: "Manager", icon: UserCog },
  { title: "Review", icon: ClipboardCheck },
];

export function AgencyRegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  // One-time intro reminder shown when the form first loads.
  const [showIntro, setShowIntro] = useState(true);

  // Agency
  const [name, setName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [geo, setGeo] = useState<GeoValue>({ countryId: null, stateId: null, districtId: null });
  const [yearEstablished, setYearEstablished] = useState("");
  const [counselorCountEstimate, setCounselorCountEstimate] = useState("");
  const [specialization, setSpecialization] = useState<string[]>([]);
  // Owner
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  // Manager (optional)
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [managerEmail, setManagerEmail] = useState("");

  const toggleSpec = (v: string) =>
    setSpecialization((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

  const validateStep = (): boolean => {
    if (step === 0) {
      if (name.trim().length < 2) return fail("Agency name is required");
      if (!registrationNumber.trim()) return fail("Registration / Trade License number is required");
      if (phone.trim().length < 7) return fail("Agency contact number is required");
      if (!isEmail(email)) return fail("A valid agency email is required");
      if (address.trim().length < 3) return fail("Address is required");
      if (!city.trim()) return fail("City is required");
      if (!geo.countryId) return fail("Country is required");
    }
    if (step === 1) {
      if (ownerName.trim().length < 2) return fail("Owner name is required");
      if (ownerPhone.trim().length < 7) return fail("Owner contact number is required");
      if (!isEmail(ownerEmail)) return fail("A valid owner email is required (becomes the login)");
    }
    if (step === 2 && (managerName || managerEmail || managerPhone)) {
      // Manager is optional, but if partially filled, require name + email.
      if (!managerName.trim() || !isEmail(managerEmail)) {
        return fail("For a manager, provide at least name and a valid email");
      }
    }
    return true;
  };

  const fail = (msg: string) => {
    toast({ title: msg, variant: "destructive" });
    return false;
  };

  const next = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        registrationNumber: registrationNumber.trim(),
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim() || "",
        address: address.trim(),
        city: city.trim(),
        countryId: geo.countryId,
        stateId: geo.stateId,
        districtId: geo.districtId,
        yearEstablished: yearEstablished ? Number(yearEstablished) : undefined,
        counselorCountEstimate: counselorCountEstimate ? Number(counselorCountEstimate) : undefined,
        specialization,
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        ownerEmail: ownerEmail.trim(),
        managerName: managerName.trim() || undefined,
        managerPhone: managerPhone.trim() || undefined,
        managerEmail: managerEmail.trim() || "",
      };
      const res = await fetch("/api/agencies/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Registration failed", description: result.error ?? "Please try again", variant: "destructive" });
        return;
      }
      toast({ title: "Registration submitted!", description: "Verify the code sent to the owner." });
      router.push(`/agency/verify?agencyId=${result.agencyId}&email=${encodeURIComponent(ownerEmail)}`);
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* One-time reminder before starting the registration */}
      {showIntro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">Before you begin</h2>
            <p className="text-sm text-muted-foreground">
              Keep your registration details and owner ID details ready to complete the registration process.
            </p>
            <Button className="w-full" onClick={() => setShowIntro(false)}>OK</Button>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <div key={s.title} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  done ? "bg-green-100 text-green-600" : active ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"} hidden sm:inline`}>
                {s.title}
              </span>
              {i < STEPS.length - 1 && <div className="w-6 h-px bg-border hidden sm:block" />}
            </div>
          );
        })}
      </div>

      {/* Step 0: Agency */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Agency Name *</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Global Pathway Consultants" className="mt-1" />
            </div>
            <div>
              <Label>Registration / Trade License No. *</Label>
              <Input required value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Agency Contact Number *</Label>
              <Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" className="mt-1" />
            </div>
            <div>
              <Label>Agency Email *</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label>Address *</Label>
              <Input required value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>City *</Label>
              <Input required value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Year Established</Label>
              <Input type="number" value={yearEstablished} onChange={(e) => setYearEstablished(e.target.value)} placeholder="e.g. 2019" className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label>Number of Counselors (estimate)</Label>
              <Input type="number" value={counselorCountEstimate} onChange={(e) => setCounselorCountEstimate(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Country / State / District *</Label>
            <GeoPicker value={geo} onChange={setGeo} />
          </div>
          <div>
            <Label className="mb-1.5 block">Specialization</Label>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATIONS.map((s) => {
                const on = specialization.includes(s.value);
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleSpec(s.value)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Owner */}
      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Owner Name *</Label>
            <Input required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Owner Contact Number *</Label>
            <Input required value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="+91 …" className="mt-1" />
          </div>
          <div>
            <Label>Owner Email * (login identity)</Label>
            <Input type="email" required value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="mt-1" />
          </div>
        </div>
      )}

      {/* Step 2: Manager (optional) */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Optional. If provided, an Agency Admin account is pre-created for the manager.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Manager Name</Label>
              <Input value={managerName} onChange={(e) => setManagerName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Manager Contact Number</Label>
              <Input value={managerPhone} onChange={(e) => setManagerPhone(e.target.value)} placeholder="+91 …" className="mt-1" />
            </div>
            <div>
              <Label>Manager Email</Label>
              <Input type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-3 text-sm">
          <ReviewRow label="Agency" value={name} />
          <ReviewRow label="Registration No." value={registrationNumber} />
          <ReviewRow label="Email" value={email} />
          <ReviewRow label="Contact" value={phone} />
          <ReviewRow label="Location" value={[city, address].filter(Boolean).join(", ")} />
          <ReviewRow label="Specialization" value={specialization.map((s) => SPECIALIZATIONS.find((x) => x.value === s)?.label).join(", ") || "—"} />
          <div className="border-t pt-3" />
          <ReviewRow label="Owner" value={`${ownerName} · ${ownerEmail}`} />
          {managerName && <ReviewRow label="Manager" value={`${managerName} · ${managerEmail}`} />}
          <p className="text-xs text-muted-foreground pt-2">
            After submitting, verify the OTP sent to the owner. Your registration then awaits Super Admin approval.
          </p>
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={back} disabled={step === 0 || loading}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next} disabled={loading}>
            Continue
          </Button>
        ) : (
          <Button type="button" onClick={submit} disabled={loading} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Registration
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}
