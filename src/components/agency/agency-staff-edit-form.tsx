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
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { updateAgencyStaff } from "@/actions/agency-staff";

const NONE = "__none__";

export interface StaffEditData {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  branchId: string | null;
  isOwner: boolean;
}

interface Props {
  staff: StaffEditData;
  branchOptions: { value: string; label: string }[];
}

export function AgencyStaffEditForm({ staff, branchOptions }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(staff.fullName);
  const [phone, setPhone] = useState(staff.phone ?? "");
  const [branchId, setBranchId] = useState<string>(staff.branchId ?? NONE);
  const [isActive, setIsActive] = useState(staff.isActive);

  const save = async () => {
    if (fullName.trim().length < 2) {
      toast({ title: "Enter the staff member's name", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await updateAgencyStaff({
        userId: staff.userId,
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        branchId: branchId === NONE ? null : branchId,
        isActive,
      });
      if (res?.error) {
        toast({ title: "Error", description: res.error, variant: "destructive" });
        return;
      }
      toast({ title: "Staff updated" });
      router.push("/agency/staff");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Edit Staff</h1>
        <p className="text-muted-foreground text-sm mt-1">{staff.role.replace(/_/g, " ")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Full Name *</Label>
          <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Email</Label>
          <Input value={staff.email} readOnly disabled />
          <p className="text-xs text-muted-foreground">The login email can&apos;t be changed here.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxxxxxxx" />
        </div>
        <div className="space-y-1.5">
          <Label>Branch</Label>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Unassigned</SelectItem>
              {branchOptions.map((b) => (
                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={isActive ? "active" : "inactive"}
            onValueChange={(v) => setIsActive(v === "active")}
            disabled={staff.isOwner}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {staff.isOwner && <p className="text-xs text-muted-foreground">The agency owner can&apos;t be deactivated.</p>}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <Button variant="outline" onClick={() => router.back()} disabled={saving}>Cancel</Button>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
