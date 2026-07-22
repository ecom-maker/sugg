import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHierarchyScope } from "@/lib/hierarchy-scope";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createAgencyLead } from "@/actions/agency-leads";
import { LeadCaptureForm } from "@/components/leads/lead-capture-form";

export const metadata: Metadata = { title: "New Lead" };

export default async function CreateAgencyLeadPage() {
  const user = await requireRole([
    "AGENCY_OWNER",
    "AGENCY_ADMIN",
    "BRANCH_MANAGER",
    "AGENCY_COUNSELOR",
  ]);

  // Owner/Admin can target any branch in their agency.
  let branches: { id: string; branchName: string }[] | undefined;
  if (user.role === "AGENCY_OWNER" || user.role === "AGENCY_ADMIN") {
    const scope = await getHierarchyScope(user);
    if (scope.agencyId) {
      branches = await prisma.agencyBranch.findMany({
        where: { agencyId: scope.agencyId, status: "ACTIVE" },
        select: { id: true, branchName: true },
        orderBy: { branchName: "asc" },
      });
    }
  }

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
        <Link href="/agency/leads">
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </Link>
      </Button>
      <LeadCaptureForm
        action={createAgencyLead}
        redirectTo="/agency/leads"
        branchOptions={branches?.map((b) => ({ value: b.id, label: b.branchName }))}
      />
    </div>
  );
}
