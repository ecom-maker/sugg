import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, Mail, MapPin, GraduationCap, Wallet, Building2 } from "lucide-react";
import { LeadActions } from "@/components/leads/lead-actions";
import type { LeadStatus } from "@/types";

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

export default async function CounselorLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["SUGG_COUNSELOR", "AGENCY_COUNSELOR", "SUPER_ADMIN"]);
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

  // A counsellor may only view their own lead.
  const isCounselor = user.role === "SUGG_COUNSELOR" || user.role === "AGENCY_COUNSELOR";
  if (isCounselor && lead.assignedToId !== user.id) redirect("/counselor/leads");

  const s = lead.student;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <Link href="/counselor/leads" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> My Leads
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{s.name}</h1>
          <p className="text-sm text-muted-foreground">Lead · {lead.source.replace(/_/g, " ")} · score {lead.score}</p>
        </div>
        <Badge variant="secondary">{lead.status.replace(/_/g, " ")}</Badge>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-2">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-1">Student</h2>
        <Row icon={Phone} label="Mobile" value={s.mobile} />
        <Row icon={Mail} label="Email" value={s.email} />
        <Row icon={MapPin} label="City" value={[s.city, s.country].filter(Boolean).join(", ") || null} />
        <Row icon={GraduationCap} label="Qualification" value={s.qualification} />
        <Row icon={GraduationCap} label="Interested" value={s.interestedCourse} />
        <Row icon={Building2} label="Preferred" value={s.preferredCollege} />
        <Row icon={Wallet} label="Max fees" value={money(s.budget)} />
      </div>

      <div className="text-sm text-muted-foreground">
        Assigned to: <span className="font-medium text-foreground">{lead.assignedTo?.fullName ?? lead.assignedTo?.email ?? "Unassigned"}</span>
      </div>

      <LeadActions leadId={lead.id} currentStatus={lead.status as LeadStatus} />

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
