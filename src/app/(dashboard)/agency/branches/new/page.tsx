import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { CreateBranchForm } from "@/components/agency/create-branch-form";

export const metadata: Metadata = { title: "Create Branch" };

export default async function CreateBranchPage() {
  await requireRole(["AGENCY_OWNER", "AGENCY_ADMIN", "SUPER_ADMIN"]);
  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Branch</h1>
        <p className="text-muted-foreground text-sm mt-1">Set up a new branch location for your agency</p>
      </div>
      <CreateBranchForm />
    </div>
  );
}
