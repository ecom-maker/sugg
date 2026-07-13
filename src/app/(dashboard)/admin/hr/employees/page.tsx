import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Mail, Phone } from "lucide-react";
import { EMPLOYEE_TYPE_LABELS, EMPLOYEE_ID_TYPE_LABELS } from "@/lib/hr";

export const metadata: Metadata = { title: "Employees" };

export default async function AdminEmployeesPage() {
  await requireRole(["SUPER_ADMIN"]);

  const employees = await prisma.employee.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {employees.length} {employees.length === 1 ? "employee" : "employees"}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/admin/hr/employees/new">
            <Plus className="w-4 h-4" /> Add Employee
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Official Contact</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Personal Contact</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">National ID</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  No employees yet. Click &ldquo;Add Employee&rdquo; to create the first one.
                </td>
              </tr>
            ) : (
              employees.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {e.employeeCode}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-xs font-semibold text-blue-600">
                        {(e.firstName[0] ?? "").toUpperCase()}
                        {(e.lastName[0] ?? "").toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{e.firstName} {e.lastName}</p>
                        {!e.isActive && <p className="text-xs text-muted-foreground">Inactive</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{EMPLOYEE_TYPE_LABELS[e.employeeType]}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    <div className="space-y-0.5">
                      {e.officialEmail && (
                        <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{e.officialEmail}</div>
                      )}
                      {e.officialPhone && (
                        <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{e.officialPhone}</div>
                      )}
                      {!e.officialEmail && !e.officialPhone && "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    <div className="space-y-0.5">
                      {e.personalEmail && (
                        <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{e.personalEmail}</div>
                      )}
                      {e.personalPhone && (
                        <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{e.personalPhone}</div>
                      )}
                      {!e.personalEmail && !e.personalPhone && "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {e.nationalIdType ? (
                      <span>
                        {EMPLOYEE_ID_TYPE_LABELS[e.nationalIdType]}
                        {e.nationalIdNumber ? ` · ${e.nationalIdNumber}` : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
