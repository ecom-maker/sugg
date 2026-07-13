import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEmployeeScope, scopeCanManage } from "@/lib/employee-scope";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";
import { EMPLOYEE_TYPE_LABELS, EMPLOYEE_ID_TYPE_LABELS } from "@/lib/hr";
import { EmployeeAccessCard } from "@/components/hr/employee-access-card";

export const metadata: Metadata = { title: "Employee" };

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2">{value?.trim() ? value : <span className="text-muted-foreground">—</span>}</span>
    </div>
  );
}

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER", "SUGG_BRANCH_MANAGER"]);
  const scope = await getEmployeeScope(user);
  if (!scope) redirect("/unauthorized");

  const { id } = await params;
  const e = await prisma.employee.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, role: true, capabilities: true } },
      branch: { select: { branchName: true } },
    },
  });
  if (!e) notFound();
  if (!scopeCanManage(scope, e.branchId, e.employeeType)) redirect("/unauthorized");

  const hasEmail = Boolean(e.officialEmail || e.personalEmail);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/admin/hr/employees" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Employees
        </Link>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/admin/hr/employees/${e.id}/edit`}><Pencil className="w-3.5 h-3.5" /> Edit</Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-sm font-semibold text-blue-600">
          {(e.firstName[0] ?? "").toUpperCase()}{(e.lastName[0] ?? "").toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{e.firstName} {e.lastName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-xs text-muted-foreground">{e.employeeCode}</span>
            <Badge variant="secondary">{EMPLOYEE_TYPE_LABELS[e.employeeType]}</Badge>
            {e.branch && <span className="text-xs text-muted-foreground">· {e.branch.branchName}</span>}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">Personal</h2>
        <Row label="Date of birth" value={e.dob ? new Date(e.dob).toLocaleDateString("en-IN") : null} />
        <Row label="Branch" value={e.branch?.branchName ?? null} />
        <Row label="Address" value={e.address} />
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">Contact</h2>
        <Row label="Personal phone" value={e.personalPhone} />
        <Row label="Official phone" value={e.officialPhone} />
        <Row label="Personal email" value={e.personalEmail} />
        <Row label="Official email" value={e.officialEmail} />
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">Primary / emergency contact</h2>
        <Row label="Name" value={e.emergencyName} />
        <Row label="Relation" value={e.emergencyRelation} />
        <Row label="Phone" value={e.emergencyPhone} />
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">Identification</h2>
        <Row
          label="National ID"
          value={
            e.nationalIdType
              ? `${EMPLOYEE_ID_TYPE_LABELS[e.nationalIdType]}${e.nationalIdNumber ? ` · ${e.nationalIdNumber}` : ""}`
              : null
          }
        />
      </div>

      {scope.isSuperAdmin && (
        <EmployeeAccessCard
          employeeId={e.id}
          hasEmail={hasEmail}
          login={e.user ? { email: e.user.email, role: e.user.role, capabilities: e.user.capabilities } : null}
        />
      )}
    </div>
  );
}
