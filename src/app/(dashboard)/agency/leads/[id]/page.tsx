import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHierarchyScope } from "@/lib/hierarchy-scope";
import { getAgencyLeadWhere } from "@/lib/agency-access";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, GraduationCap, MapPin, History } from "lucide-react";
import { AgencyLeadActions } from "@/components/agency/agency-lead-actions";
import type { LeadStatus } from "@/types";

export const metadata: Metadata = { title: "Lead" };

const label = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());

export default async function AgencyLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole([
    "AGENCY_OWNER",
    "AGENCY_ADMIN",
    "BRANCH_MANAGER",
    "AGENCY_COUNSELOR",
  ]);
  const { id } = await params;

  // Scope guard: only leads the user may see.
  const scopeWhere = await getAgencyLeadWhere(user);
  const lead = await prisma.lead.findFirst({
    where: { id, ...scopeWhere } as never,
    include: {
      student: true,
      assignedTo: { select: { id: true, fullName: true } },
      branch: { select: { branchName: true } },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { changedBy: { select: { fullName: true } } },
      },
    },
  });
  if (!lead) notFound();

  // Counselor options for reassignment (owner/admin: whole agency; branch
  // manager: own branch). Counselors cannot reassign.
  const scope = await getHierarchyScope(user);
  let counselors: { id: string; name: string }[] = [];
  if (
    (user.role === "AGENCY_OWNER" || user.role === "AGENCY_ADMIN" || user.role === "BRANCH_MANAGER") &&
    scope.agencyId
  ) {
    const members = await prisma.agencyUser.findMany({
      where: {
        agencyId: scope.agencyId,
        status: "ACTIVE",
        ...(user.role === "BRANCH_MANAGER" ? { branchId: scope.branchId } : {}),
        user: { role: { in: ["AGENCY_COUNSELOR", "BRANCH_MANAGER"] } },
      },
      select: { user: { select: { id: true, fullName: true } } },
    });
    counselors = members.map((m) => ({ id: m.user.id, name: m.user.fullName }));
  }

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
        <Link href="/agency/leads">
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{lead.student.name}</h1>
          <p className="text-sm text-muted-foreground">
            {lead.branch?.branchName ?? "Unassigned branch"} ·{" "}
            {lead.assignedTo ? `Assigned to ${lead.assignedTo.fullName}` : "Unassigned"}
          </p>
        </div>
        <Badge>{label(lead.status)}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h2 className="font-semibold">Student details</h2>
            <div className="grid gap-3 sm:grid-cols-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> {lead.student.mobile}</div>
              {lead.student.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> {lead.student.email}</div>}
              {lead.student.interestedCourse && (
                <div className="flex items-center gap-2"><GraduationCap className="w-4 h-4" /> {lead.student.interestedCourse}</div>
              )}
              {(lead.student.city || lead.student.country) && (
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {[lead.student.city, lead.student.country].filter(Boolean).join(", ")}</div>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold">Status history</h2>
            </div>
            {lead.statusHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No status changes yet.</p>
            ) : (
              <ol className="relative border-l pl-4 space-y-4">
                {lead.statusHistory.map((h) => (
                  <li key={h.id} className="text-sm">
                    <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-primary" />
                    <p className="font-medium">
                      {h.fromStatus ? `${label(h.fromStatus)} → ` : ""}
                      {label(h.toStatus)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.createdAt).toLocaleString()}
                      {h.changedBy ? ` · ${h.changedBy.fullName}` : ""}
                    </p>
                    {h.note && <p className="text-xs text-muted-foreground mt-0.5">{h.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <AgencyLeadActions
            leadId={lead.id}
            currentStatus={lead.status as LeadStatus}
            currentAssigneeId={lead.assignedTo?.id ?? null}
            counselors={counselors}
          />
        </div>
      </div>
    </div>
  );
}
