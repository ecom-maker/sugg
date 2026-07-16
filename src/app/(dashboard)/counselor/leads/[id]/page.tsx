import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveLeadAccess } from "@/lib/lead-access";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, Mail, MapPin, GraduationCap, Wallet, Building2, History } from "lucide-react";
import { LeadActions } from "@/components/leads/lead-actions";
import { LeadDetailsEditor } from "@/components/leads/lead-details-editor";
import { leadStatusClass, leadStatusLabel, type LeadStatus } from "@/types";

export const metadata: Metadata = { title: "Lead" };

function money(v: unknown) {
  const n = Number(v ?? 0);
  return n > 0 ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n) : null;
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <span className="text-muted-foreground min-w-24">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

const FIELD_LABEL: Record<string, string> = {
  status: "Status", maxFees: "Max fees", interestedCourse: "Interested courses", preferredCollege: "Preferred colleges",
};
function fmtVal(k: string, v: unknown): string {
  if (v == null || v === "") return "—";
  if (k === "maxFees") { const n = Number(v); return n > 0 ? `₹${n.toLocaleString("en-IN")}` : "Any"; }
  return String(v).replace(/_/g, " ");
}

export default async function CounselorLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole([
    "SUGG_COUNSELOR", "AGENCY_COUNSELOR", "SUGG_BRANCH_MANAGER", "BRANCH_MANAGER", "SUPER_ADMIN",
  ]);
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      student: true,
      assignedTo: { select: { fullName: true, email: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { user: { select: { fullName: true } } } },
    },
  });
  if (!lead) notFound();

  const access = await resolveLeadAccess(user, lead);
  if (!access.canView) redirect("/counselor/leads");

  const history = await prisma.auditLog.findMany({
    where: { resource: "lead", resourceId: id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { fullName: true } } },
  });

  const s = lead.student;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <Link href="/counselor/leads" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to leads
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{s.name}</h1>
          <p className="text-sm text-muted-foreground">Lead · {lead.source.replace(/_/g, " ")} · score {lead.score}</p>
        </div>
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${leadStatusClass(lead.status as LeadStatus)}`}>
          {leadStatusLabel(lead.status as LeadStatus)}
        </span>
      </div>

      {s.shortlistedCollege && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="text-sm">
            <span className="font-semibold">Shortlisted College:</span> {s.shortlistedCollege}
          </span>
        </div>
      )}

      <div className="rounded-lg border bg-card p-5 space-y-2">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-1">Student</h2>
        <Row icon={Phone} label="Mobile" value={s.mobile} />
        <Row icon={Mail} label="Email" value={s.email} />
        <Row icon={MapPin} label="City" value={[s.city, s.country].filter(Boolean).join(", ") || null} />
        <Row icon={GraduationCap} label="Qualification" value={s.qualification} />
        <Row icon={GraduationCap} label="Interested" value={s.interestedCourse} />
        <Row icon={Building2} label="Preferred" value={s.preferredCollege} />
        <Row icon={Wallet} label="Fee range" value={
          s.budgetMin != null || s.budget != null
            ? `${money(s.budgetMin) ?? "₹0"} – ${money(s.budget) ?? "Max"}`
            : null
        } />
        <Row icon={Building2} label="Shortlisted" value={s.shortlistedCollege} />
      </div>

      <div className="text-sm text-muted-foreground">
        Assigned to: <span className="font-medium text-foreground">{lead.assignedTo?.fullName ?? lead.assignedTo?.email ?? "Unassigned"}</span>
      </div>

      {access.canEdit && (
        <LeadDetailsEditor
          leadId={lead.id}
          budget={s.budget != null ? Number(s.budget) : null}
          budgetMin={s.budgetMin != null ? Number(s.budgetMin) : null}
          interestedCourse={s.interestedCourse}
          preferredCollege={s.preferredCollege}
        />
      )}

      {access.canEdit && (
        <LeadActions
          leadId={lead.id}
          currentStatus={lead.status as LeadStatus}
          shortlistedCollege={s.shortlistedCollege}
          preferredColleges={(s.preferredCollege ?? "").split(",").map((x) => x.trim()).filter(Boolean)}
        />
      )}

      {/* Change history */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <History className="w-4 h-4" /> Change history
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((h) => {
              const nv = (h.newValue ?? {}) as Record<string, unknown>;
              const ov = (h.oldValue ?? {}) as Record<string, unknown>;
              const keys = Object.keys(nv);
              return (
                <li key={h.id} className="text-sm border-l-2 border-muted pl-3">
                  {h.action === "CREATE_LEAD" ? (
                    <p>Lead created</p>
                  ) : keys.length > 0 ? (
                    keys.map((k) => (
                      <p key={k}>
                        {FIELD_LABEL[k] ?? k}:{" "}
                        <span className="line-through text-muted-foreground">{fmtVal(k, ov[k])}</span>
                        {" → "}
                        <span className="font-medium">{fmtVal(k, nv[k])}</span>
                      </p>
                    ))
                  ) : (
                    <p>{h.action.replace(/_/g, " ").toLowerCase()}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {h.user?.fullName ?? "—"} · {new Date(h.createdAt).toLocaleString("en-IN")}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Notes */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Notes ({lead.notes.length})</h2>
        {lead.notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="space-y-3">
            {lead.notes.map((n) => (
              <li key={n.id} className="text-sm border-l-2 border-muted pl-3">
                <p>{n.content}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {n.user?.fullName ?? "—"} · {new Date(n.createdAt).toLocaleString("en-IN")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
