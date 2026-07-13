import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, Users, Briefcase, UserCheck, MapPin, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Sugg Branch" };

export default async function SuggBranchDashboard() {
  const user = await requireRole(["SUGG_BRANCH_MANAGER", "SUPER_ADMIN"]);

  // Resolve the manager's Sugg Branch: from their own employee record, or a
  // branch they manage directly.
  const emp = await prisma.employee.findFirst({
    where: { userId: user.id },
    select: { branchId: true },
  });
  let branchId = emp?.branchId ?? null;
  if (!branchId) {
    const managed = await prisma.suggBranch.findFirst({ where: { managerId: user.id }, select: { id: true } });
    branchId = managed?.id ?? null;
  }

  const branch = branchId
    ? await prisma.suggBranch.findUnique({
        where: { id: branchId },
        include: {
          geoState: { select: { stateName: true } },
          geoDistrict: { select: { districtName: true } },
          _count: { select: { employees: true, agencies: true, counselors: true, territories: true } },
        },
      })
    : null;

  if (!branch) {
    return (
      <div className="p-6">
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No Sugg Branch assigned to you yet.</p>
          <p className="text-sm mt-1">Ask a Super Admin to set you as a branch&apos;s manager or assign your employee record to a Sugg Branch.</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Employees", value: branch._count.employees, icon: Users },
    { label: "Agencies", value: branch._count.agencies, icon: Briefcase },
    { label: "Counselors", value: branch._count.counselors, icon: UserCheck },
    { label: "Territories", value: branch._count.territories, icon: MapPin },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
          <GitBranch className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{branch.branchName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-xs text-muted-foreground">{branch.branchCode}</span>
            <Badge variant={branch.status === "ACTIVE" ? "success" : "secondary"}>{branch.status}</Badge>
            {(branch.geoDistrict || branch.geoState) && (
              <span className="text-xs text-muted-foreground">
                · {[branch.geoDistrict?.districtName, branch.geoState?.stateName].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Icon className="w-4 h-4" /> {s.label}
              </div>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border bg-card p-5 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Branch employees</h2>
          <p className="text-sm text-muted-foreground">Add and manage staff (Counsellor, Office Assistant, Driver) for this branch.</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/admin/hr/employees">Manage employees <ArrowRight className="w-4 h-4" /></Link>
        </Button>
      </div>
    </div>
  );
}
