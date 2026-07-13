import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEmployeeScope, getEmployeeFormContext, scopeCanManage } from "@/lib/employee-scope";
import { EmployeeForm, type EmployeeFormValues } from "@/components/hr/employee-form";

export const metadata: Metadata = { title: "Edit Employee" };

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER", "SUGG_BRANCH_MANAGER"]);
  const scope = await getEmployeeScope(user);
  if (!scope) redirect("/unauthorized");

  const { id } = await params;
  const e = await prisma.employee.findUnique({ where: { id } });
  if (!e) notFound();
  if (!scopeCanManage(scope, e.branchId, e.employeeType)) redirect("/unauthorized");

  const ctx = await getEmployeeFormContext(scope);

  const values: EmployeeFormValues = {
    id: e.id,
    employeeCode: e.employeeCode,
    firstName: e.firstName,
    lastName: e.lastName,
    dob: e.dob ? new Date(e.dob).toISOString().slice(0, 10) : "",
    address: e.address ?? "",
    personalPhone: e.personalPhone ?? "",
    officialPhone: e.officialPhone ?? "",
    personalEmail: e.personalEmail ?? "",
    officialEmail: e.officialEmail ?? "",
    emergencyName: e.emergencyName ?? "",
    emergencyRelation: e.emergencyRelation ?? "",
    emergencyPhone: e.emergencyPhone ?? "",
    nationalIdType: e.nationalIdType,
    nationalIdNumber: e.nationalIdNumber ?? "",
    employeeType: e.employeeType,
    branchId: e.branchId,
  };

  return (
    <div className="p-6">
      <EmployeeForm
        employee={values}
        branchOptions={ctx.branchOptions}
        allowedTypes={ctx.allowedTypes}
        canPickBranch={ctx.canPickBranch}
        fixedBranchLabel={ctx.fixedBranchLabel}
      />
    </div>
  );
}
