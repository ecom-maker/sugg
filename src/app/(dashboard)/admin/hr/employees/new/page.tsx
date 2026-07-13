import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getEmployeeScope, getEmployeeFormContext } from "@/lib/employee-scope";
import { EmployeeForm } from "@/components/hr/employee-form";

export const metadata: Metadata = { title: "New Employee" };

export default async function NewEmployeePage() {
  const user = await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER"]);
  const scope = await getEmployeeScope(user);
  if (!scope) redirect("/unauthorized");
  const ctx = await getEmployeeFormContext(scope);

  return (
    <div className="p-6">
      <EmployeeForm
        branchOptions={ctx.branchOptions}
        allowedTypes={ctx.allowedTypes}
        canPickBranch={ctx.canPickBranch}
        fixedBranchLabel={ctx.fixedBranchLabel}
      />
    </div>
  );
}
