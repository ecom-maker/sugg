import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSuggBranchScope, scopedLeadWhere } from "@/lib/sugg-branch-scope";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { LeadStatus } from "@/types";
import { BranchLeadsView } from "@/components/sugg-branches/branch-leads-view";

export const metadata: Metadata = { title: "Students & Leads" };

// Leads within this Sugg Branch's territory (mapped agencies + branch counselors).
export default async function BranchLeadsPage() {
  const user = await requireRole(["SUGG_BRANCH_MANAGER", "SUPER_ADMIN"]);
  const scope = await getSuggBranchScope(user);

  const leads = scope
    ? await prisma.lead.findMany({
        where: await scopedLeadWhere(scope.suggBranchId),
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          student: { select: { name: true, mobile: true, agency: { select: { name: true } } } },
          assignedTo: { select: { fullName: true } },
        },
      })
    : [];

  const rows = leads.map((l) => ({
    id: l.id,
    code: l.code,
    status: l.status as LeadStatus,
    name: l.student.name,
    mobile: l.student.mobile,
    agency: l.student.agency?.name ?? null,
    assignedTo: l.assignedTo?.fullName ?? null,
    createdAtLabel: new Date(l.createdAt).toLocaleDateString("en-IN"),
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Students &amp; Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {scope ? `${leads.length} leads in ${scope.branchName}` : "No Sugg Branch assigned to you yet."}
          </p>
        </div>
        {scope && (
          <Button asChild className="gap-2">
            <Link href="/sugg-branch/leads/new"><Plus className="w-4 h-4" /> Add Lead</Link>
          </Button>
        )}
      </div>

      <BranchLeadsView rows={rows} />
    </div>
  );
}
