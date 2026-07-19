"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Loader2, Users, Plus, UserPlus, KeyRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { EmployeeType } from "@prisma/client";
import { EMPLOYEE_TYPE_LABELS } from "@/lib/hr";
import { provisionEmployeeLogin } from "@/actions/employees";

// Roles assignable from the branch page. "Manager" maps to the branch-manager
// employee type (which grants branch-scoped access via the employee's branchId).
const ROLE_OPTIONS: { value: EmployeeType; label: string }[] = [
  { value: "BRANCH_MANAGER", label: "Manager" },
  { value: "TEAM_LEADER", label: "Team Leader" },
  { value: "COUNSELLOR", label: "Counsellor" },
];

export interface BranchEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  employeeType: EmployeeType;
  loginEmail: string | null;
}

interface Props {
  branchId: string;
  branchName: string;
  employees: BranchEmployee[];
}

const emptyForm = {
  firstName: "",
  lastName: "",
  employeeType: "" as EmployeeType | "",
  loginEmail: "",
  loginPassword: "",
};

export function BranchEmployees({ branchId, branchName, employees }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);

  const set = <K extends keyof typeof emptyForm>(k: K, val: (typeof emptyForm)[K]) =>
    setF((s) => ({ ...s, [k]: val }));

  const reset = () => {
    setF(emptyForm);
    setOpen(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.firstName.trim() || !f.lastName.trim()) {
      toast({ title: "First and last name are required", variant: "destructive" });
      return;
    }
    if (!f.employeeType) {
      toast({ title: "Select a role", variant: "destructive" });
      return;
    }
    if (f.loginPassword && f.loginPassword.length < 6) {
      toast({ title: "Login password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (f.loginPassword && !f.loginEmail.trim()) {
      toast({ title: "Enter a login email for the password", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: f.firstName.trim(),
          lastName: f.lastName.trim(),
          employeeType: f.employeeType,
          officialEmail: f.loginEmail.trim() || null,
          branchId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Request failed", variant: "destructive" });
        return;
      }

      const id: string | undefined = data.employee?.id;

      if (f.loginPassword && id) {
        const prov = await provisionEmployeeLogin(id, {
          email: f.loginEmail.trim(),
          password: f.loginPassword,
        });
        if (prov?.error) {
          toast({ title: "Employee added, but login failed", description: prov.error, variant: "destructive" });
          reset();
          router.refresh();
          return;
        }
        toast({ title: "Employee added and login created" });
      } else {
        toast({ title: "Employee added" });
      }

      reset();
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Users className="w-4 h-4" /> Employees · {branchName}
        </h2>
        {!open && (
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add employee
          </Button>
        )}
      </div>

      {/* Current employees */}
      {employees.length === 0 ? (
        <p className="text-sm text-muted-foreground">No employees assigned to this branch yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {employees.map((emp) => (
            <li key={emp.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                {emp.firstName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/admin/hr/employees/${emp.id}`} className="font-medium hover:text-primary transition-colors">
                  {emp.firstName} {emp.lastName}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{emp.employeeCode}</span>
                  {emp.loginEmail && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1"><KeyRound className="w-3 h-3" />{emp.loginEmail}</span>
                    </>
                  )}
                </div>
              </div>
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground shrink-0">
                {EMPLOYEE_TYPE_LABELS[emp.employeeType]}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Add form */}
      {open && (
        <form onSubmit={submit} className="rounded-md border bg-muted/20 p-4 space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> New employee for {branchName}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={f.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="First name" />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input value={f.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Last name" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Role *</Label>
              <Select value={f.employeeType || undefined} onValueChange={(val) => set("employeeType", val as EmployeeType)}>
                <SelectTrigger aria-required="true"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4 space-y-1.5">
            <Label className="flex items-center gap-1.5 text-muted-foreground"><KeyRound className="w-3.5 h-3.5" /> Login access (optional)</Label>
            <p className="text-xs text-muted-foreground">Fill both fields to create a login now, or leave the password blank to skip.</p>
            <div className="grid gap-4 sm:grid-cols-2 pt-1">
              <Input type="email" value={f.loginEmail} onChange={(e) => set("loginEmail", e.target.value)} placeholder="Login email" />
              <Input type="password" value={f.loginPassword} onChange={(e) => set("loginPassword", e.target.value)} placeholder="Password (min 6 chars)" autoComplete="new-password" />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={reset} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading} className="gap-1.5">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Employee
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
