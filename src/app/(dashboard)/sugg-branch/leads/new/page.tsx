import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getSuggBranchScope } from "@/lib/sugg-branch-scope";
import { AddLeadForm } from "@/components/sugg-branch/add-lead-form";

export const metadata: Metadata = { title: "Add Lead" };

export default async function AddBranchLeadPage() {
  const user = await requireRole(["SUGG_BRANCH_MANAGER", "SUPER_ADMIN"]);
  const scope = await getSuggBranchScope(user);
  if (!scope) redirect("/sugg-branch");
  return (
    <div className="p-6">
      <AddLeadForm />
    </div>
  );
}
