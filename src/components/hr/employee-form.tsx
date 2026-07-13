"use client";

import { useEffect, useState } from "react";
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
import { Loader2, User, Phone, ShieldAlert, IdCard, Briefcase, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { EmployeeType, EmployeeIdType } from "@prisma/client";
import { EMPLOYEE_TYPE_LABELS, EMPLOYEE_ID_TYPE_OPTIONS } from "@/lib/hr";

const NONE_ID = "__none__";
const NONE_BRANCH = "__none_branch__";

export interface EmployeeFormValues {
  id?: string;
  employeeCode?: string;
  firstName: string;
  lastName: string;
  dob: string;
  address: string;
  personalPhone: string;
  officialPhone: string;
  personalEmail: string;
  officialEmail: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
  nationalIdType: EmployeeIdType | null;
  nationalIdNumber: string;
  employeeType: EmployeeType | "";
  branchId: string | null;
}

interface Props {
  employee?: EmployeeFormValues;
  /** Selectable branches for a Super Admin. Empty for a Branch Manager. */
  branchOptions: { value: string; label: string }[];
  /** Employee types the current user may assign. */
  allowedTypes: EmployeeType[];
  /** Super Admin may choose the branch; a Branch Manager cannot. */
  canPickBranch: boolean;
  /** The fixed branch label shown to a Branch Manager. */
  fixedBranchLabel?: string | null;
}

const empty: EmployeeFormValues = {
  firstName: "", lastName: "", dob: "", address: "",
  personalPhone: "", officialPhone: "", personalEmail: "", officialEmail: "",
  emergencyName: "", emergencyRelation: "", emergencyPhone: "",
  nationalIdType: null, nationalIdNumber: "", employeeType: "", branchId: null,
};

export function EmployeeForm({ employee, branchOptions, allowedTypes, canPickBranch, fixedBranchLabel }: Props) {
  const router = useRouter();
  const isEdit = Boolean(employee?.id);
  const init = employee ?? empty;

  const [v, setV] = useState<EmployeeFormValues>(init);
  const [employeeCode, setEmployeeCode] = useState(employee?.employeeCode ?? "");
  const [isLoading, setIsLoading] = useState(false);

  const set = <K extends keyof EmployeeFormValues>(k: K, val: EmployeeFormValues[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  // On create, preview the system-generated code.
  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    fetch("/api/admin/employees/next-code")
      .then((r) => r.json())
      .then((d) => !cancelled && setEmployeeCode(d.code ?? ""))
      .catch(() => !cancelled && setEmployeeCode(""));
    return () => { cancelled = true; };
  }, [isEdit]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.firstName.trim() || !v.lastName.trim()) {
      toast({ title: "First and last name are required", variant: "destructive" });
      return;
    }
    if (!v.employeeType) {
      toast({ title: "Employee type is required", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        dob: v.dob || null,
        address: v.address.trim() || null,
        personalPhone: v.personalPhone.trim() || null,
        officialPhone: v.officialPhone.trim() || null,
        personalEmail: v.personalEmail.trim() || null,
        officialEmail: v.officialEmail.trim() || null,
        emergencyName: v.emergencyName.trim() || null,
        emergencyRelation: v.emergencyRelation.trim() || null,
        emergencyPhone: v.emergencyPhone.trim() || null,
        nationalIdType: v.nationalIdType,
        nationalIdNumber: v.nationalIdNumber.trim() || null,
        employeeType: v.employeeType,
        // Branch is only sent by Super Admin; server ignores it for others.
        ...(canPickBranch ? { branchId: v.branchId } : {}),
      };

      const res = await fetch(
        isEdit ? `/api/admin/employees/${employee!.id}` : "/api/admin/employees",
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

      toast({ title: isEdit ? "Employee updated" : "Employee added" });
      const id = data.employee?.id ?? employee?.id;
      router.push(id ? `/admin/hr/employees/${id}` : "/admin/hr/employees");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const typeOptions = allowedTypes.map((t) => ({ value: t, label: EMPLOYEE_TYPE_LABELS[t] }));

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{isEdit ? "Edit Employee" : "New Employee"}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isEdit ? "Update this employee's details." : "Add a member of the Sugg operations team."}
        </p>
      </div>

      {/* Personal & role */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <User className="w-4 h-4" /> Personal information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Employee Code</Label>
            <Input value={employeeCode} readOnly disabled placeholder="Auto-generated on save" className="font-mono max-w-xs" />
            {!isEdit && <p className="text-xs text-muted-foreground">System-generated (e.g. SUGG-EMP-0001).</p>}
          </div>
          <div className="space-y-1.5">
            <Label>First Name *</Label>
            <Input required value={v.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="First name" />
          </div>
          <div className="space-y-1.5">
            <Label>Last Name *</Label>
            <Input required value={v.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Last name" />
          </div>
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <Input type="date" value={v.dob} onChange={(e) => set("dob", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Employee Type *</Label>
            <Select value={v.employeeType || undefined} onValueChange={(val) => set("employeeType", val as EmployeeType)}>
              <SelectTrigger aria-required="true"><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {typeOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Branch</Label>
            {canPickBranch ? (
              <Select
                value={v.branchId ?? NONE_BRANCH}
                onValueChange={(val) => set("branchId", val === NONE_BRANCH ? null : val)}
              >
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_BRANCH}>Unassigned</SelectItem>
                  {branchOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={fixedBranchLabel ?? "Your branch"} readOnly disabled />
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Address</Label>
            <Input value={v.address} onChange={(e) => set("address", e.target.value)} placeholder="Street address" />
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
            <Input value={v.personalPhone} onChange={(e) => set("personalPhone", e.target.value)} placeholder="+91 98xxxxxxxx" />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Number — Official</Label>
            <Input value={v.officialPhone} onChange={(e) => set("officialPhone", e.target.value)} placeholder="+91 98xxxxxxxx" />
          </div>
          <div className="space-y-1.5">
            <Label>Personal Email</Label>
            <Input type="email" value={v.personalEmail} onChange={(e) => set("personalEmail", e.target.value)} placeholder="name@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Official Email</Label>
            <Input type="email" value={v.officialEmail} onChange={(e) => set("officialEmail", e.target.value)} placeholder="name@sugg.in" />
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
            <Input value={v.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-1.5">
            <Label>Relation</Label>
            <Input value={v.emergencyRelation} onChange={(e) => set("emergencyRelation", e.target.value)} placeholder="e.g. Father, Spouse" />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Number</Label>
            <Input value={v.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} placeholder="+91 98xxxxxxxx" />
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
              value={v.nationalIdType ?? NONE_ID}
              onValueChange={(val) => set("nationalIdType", val === NONE_ID ? null : (val as EmployeeIdType))}
            >
              <SelectTrigger><SelectValue placeholder="Select ID type" /></SelectTrigger>
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
            <Input value={v.nationalIdNumber} onChange={(e) => set("nationalIdNumber", e.target.value)} placeholder="Document number" disabled={!v.nationalIdType} />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>Cancel</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Save changes" : "Add Employee"}
        </Button>
      </div>
    </form>
  );
}
