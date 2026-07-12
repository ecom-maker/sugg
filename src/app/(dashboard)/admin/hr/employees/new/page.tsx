import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { EmployeeForm } from "@/components/hr/employee-form";

export const metadata: Metadata = { title: "New Employee" };

export default async function NewEmployeePage() {
  await requireRole(["SUPER_ADMIN"]);
  return (
    <div className="p-6">
      <EmployeeForm />
    </div>
  );
}
