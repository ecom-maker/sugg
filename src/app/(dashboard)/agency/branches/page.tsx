import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Building2, Plus, MapPin, Phone, Mail, Users } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Branches" };

export default async function BranchesPage() {
  const user = await requireRole(["AGENCY_OWNER", "AGENCY_ADMIN", "SUPER_ADMIN"]);

  const agency = await prisma.agency.findFirst({
    where: {
      OR: [
        { owner: { supabaseId: user.supabaseId } },
        { agencyUsers: { some: { user: { supabaseId: user.supabaseId } } } },
      ],
    },
  });

  const branches = agency
    ? await prisma.agencyBranch.findMany({
        where: { agencyId: agency.id },
        orderBy: { branchName: "asc" },
        include: {
          manager: { select: { fullName: true, email: true } },
          _count: { select: { agencyUsers: true, students: true, leads: true, applications: true } },
        },
      })
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Branches</h1>
          <p className="text-muted-foreground text-sm mt-1">{branches.length} branches</p>
        </div>
        <Link href="/agency/branches/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" />New Branch
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No branches yet</p>
            <p className="text-sm mt-1">Create your first branch to start managing your agency</p>
            <Link href="/agency/branches/new" className="mt-4 inline-flex items-center gap-2 text-primary hover:underline text-sm">
              <Plus className="w-3 h-3" />Create Branch
            </Link>
          </div>
        ) : (
          branches.map((branch) => (
            <div key={branch.id} className="rounded-lg border bg-card p-5 space-y-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{branch.branchName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{branch.branchCode}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  branch.status === "ACTIVE" ? "bg-green-100 text-green-700"
                  : branch.status === "INACTIVE" ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-600"
                }`}>
                  {branch.status}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-muted-foreground">
                {(branch.city ?? branch.state) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{[branch.city, branch.state, branch.country].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{branch.phone}</div>
                )}
                {branch.email && (
                  <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{branch.email}</div>
                )}
                {branch.manager && (
                  <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5" />Manager: {branch.manager.fullName}</div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-1 pt-2 border-t text-center text-xs">
                {[
                  { label: "Staff", val: branch._count.agencyUsers },
                  { label: "Students", val: branch._count.students },
                  { label: "Leads", val: branch._count.leads },
                  { label: "Apps", val: branch._count.applications },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="font-bold text-sm">{s.val}</p>
                    <p className="text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <Link href={`/agency/branches/${branch.id}`} className="flex-1 text-center text-xs bg-muted hover:bg-muted/80 py-1.5 rounded-md font-medium transition-colors">
                  View
                </Link>
                <Link href={`/agency/branches/${branch.id}/edit`} className="flex-1 text-center text-xs bg-primary/10 hover:bg-primary/20 text-primary py-1.5 rounded-md font-medium transition-colors">
                  Edit
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
