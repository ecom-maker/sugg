import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgencyLeadWhere } from "@/lib/agency-access";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { leadStatusClass, leadStatusLabel, type LeadStatus } from "@/types";

export const metadata: Metadata = { title: "Leads" };

function label(s: string) {
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
}

export default async function AgencyLeadsPage() {
  const user = await requireRole([
    "AGENCY_OWNER",
    "AGENCY_ADMIN",
    "BRANCH_MANAGER",
    "AGENCY_COUNSELOR",
  ]);

  const where = await getAgencyLeadWhere(user);
  const leads = await prisma.lead.findMany({
    where: { ...where, isCurrent: true } as never,
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { name: true, mobile: true, interestedCourse: true } },
      assignedTo: { select: { fullName: true } },
      branch: { select: { branchName: true } },
    },
    take: 200,
  });

  const scopeLabel =
    user.role === "AGENCY_OWNER" || user.role === "AGENCY_ADMIN"
      ? "across your agency"
      : user.role === "BRANCH_MANAGER"
        ? "in your branch"
        : "assigned to you";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {leads.length} leads {scopeLabel}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/agency/leads/create">
            <Plus className="w-4 h-4" /> New Lead
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Course</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">Assigned</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Branch</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No leads yet. Create your first student lead.
                </td>
              </tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/agency/leads/${l.id}`} className="font-medium text-primary hover:underline">
                      {l.student.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {l.code && <span className="font-mono">{l.code} · </span>}{l.student.mobile}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {l.student.interestedCourse ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {l.assignedTo?.fullName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {l.branch?.branchName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${leadStatusClass(l.status as LeadStatus)}`}>
                      {leadStatusLabel(l.status as LeadStatus)}
                    </span>
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
