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
import { Loader2, User, Phone, ShieldAlert, IdCard, Briefcase } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { EmployeeType, EmployeeIdType } from "@prisma/client";
import {
  EMPLOYEE_TYPE_OPTIONS,
  EMPLOYEE_ID_TYPE_OPTIONS,
} from "@/lib/hr";

const NONE_ID = "__none__";

export function EmployeeForm() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [personalPhone, setPersonalPhone] = useState("");
  const [officialPhone, setOfficialPhone] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [nationalIdType, setNationalIdType] = useState<EmployeeIdType | null>(null);
  const [nationalIdNumber, setNationalIdNumber] = useState("");
  const [employeeType, setEmployeeType] = useState<EmployeeType | "">("");
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "First and last name are required", variant: "destructive" });
      return;
    }
    if (!employeeType) {
      toast({ title: "Employee type is required", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob: dob || null,
        address: address.trim() || null,
        personalPhone: personalPhone.trim() || null,
        officialPhone: officialPhone.trim() || null,
        personalEmail: personalEmail.trim() || null,
        officialEmail: officialEmail.trim() || null,
        emergencyName: emergencyName.trim() || null,
        emergencyRelation: emergencyRelation.trim() || null,
        emergencyPhone: emergencyPhone.trim() || null,
        nationalIdType: nationalIdType,
        nationalIdNumber: nationalIdNumber.trim() || null,
        employeeType,
      };

      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Request failed", variant: "destructive" });
        return;
      }

      toast({ title: "Employee added" });
      router.push("/admin/hr/employees");
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
        <h1 className="text-2xl font-bold">New Employee</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Add a member of the Sugg operations team.
        </p>
      </div>

      {/* Personal & role */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <User className="w-4 h-4" /> Personal information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>First Name *</Label>
            <Input required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
          </div>
          <div className="space-y-1.5">
            <Label>Last Name *</Label>
            <Input required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
          </div>
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Employee Type *
            </Label>
            <Select value={employeeType || undefined} onValueChange={(v) => setEmployeeType(v as EmployeeType)}>
              <SelectTrigger aria-required="true">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYEE_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Phone className="w-4 h-4" /> Contact
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Contact Number — Personal</Label>
            <Input value={personalPhone} onChange={(e) => setPersonalPhone(e.target.value)} placeholder="+91 98xxxxxxxx" />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Number — Official</Label>
            <Input value={officialPhone} onChange={(e) => setOfficialPhone(e.target.value)} placeholder="+91 98xxxxxxxx" />
          </div>
          <div className="space-y-1.5">
            <Label>Personal Email</Label>
            <Input type="email" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} placeholder="name@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Official Email</Label>
            <Input type="email" value={officialEmail} onChange={(e) => setOfficialEmail(e.target.value)} placeholder="name@sugg.in" />
          </div>
        </div>
      </div>

      {/* Emergency contact */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Primary / emergency contact
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Contact Name</Label>
            <Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-1.5">
            <Label>Relation</Label>
            <Input value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)} placeholder="e.g. Father, Spouse" />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Number</Label>
            <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="+91 98xxxxxxxx" />
          </div>
        </div>
      </div>

      {/* Identification */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <IdCard className="w-4 h-4" /> Identification
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>National ID Type</Label>
            <Select
              value={nationalIdType ?? NONE_ID}
              onValueChange={(v) => setNationalIdType(v === NONE_ID ? null : (v as EmployeeIdType))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select ID type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_ID}>—</SelectItem>
                {EMPLOYEE_ID_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>ID Number</Label>
            <Input
              value={nationalIdNumber}
              onChange={(e) => setNationalIdNumber(e.target.value)}
              placeholder="Document number"
              disabled={!nationalIdType}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Add Employee
        </Button>
      </div>
    </form>
  );
}
