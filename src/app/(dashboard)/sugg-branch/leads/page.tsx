import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSuggBranchScope, scopedLeadWhere } from "@/lib/sugg-branch-scope";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus } from "lucide-react";
import { leadStatusClass, leadStatusLabel, type LeadStatus } from "@/types";

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

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Agency</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Assigned To</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />No leads in this branch yet.
              </td></tr>
            ) : leads.map((l) => (
              <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link href={`/counselor/leads/${l.id}`} className="font-medium hover:text-primary transition-colors">
                    {l.student.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {l.code && <span className="font-mono">{l.code} · </span>}{l.student.mobile}
                  </p>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{l.student.agency?.name ?? "—"}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{l.assignedTo?.fullName ?? "Unassigned"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${leadStatusClass(l.status as LeadStatus)}`}>
                    {leadStatusLabel(l.status as LeadStatus)}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{new Date(l.createdAt).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
