import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Building2, Users, Briefcase } from "lucide-react";
import { TerritoryManager, type TerritoryRow } from "@/components/sugg-branches/territory-manager";
import { BranchSettings } from "@/components/sugg-branches/branch-settings";
import { ChangeHistory } from "@/components/shared/change-history";

export const metadata: Metadata = { title: "Sugg Branch" };

const statusVariant: Record<string, "success" | "secondary" | "outline"> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  ARCHIVED: "outline",
};

const approvalVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "destructive",
  SUSPENDED: "secondary",
};

export default async function SuggBranchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["SUPER_ADMIN"]);
  const { id } = await params;

  const branch = await prisma.suggBranch.findUnique({
    where: { id },
    include: {
      manager: { select: { fullName: true, email: true, phone: true } },
      geoCountry: { select: { countryName: true } },
      geoState: { select: { stateName: true } },
      geoDistrict: { select: { districtName: true } },
      territories: {
        orderBy: { createdAt: "asc" },
        include: {
          geoCountry: { select: { countryName: true } },
          geoState: { select: { stateName: true } },
          geoDistrict: { select: { districtName: true } },
        },
      },
      agencies: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          approvalStatus: true,
          isActive: true,
          _count: { select: { branches: true } },
        },
      },
      counselors: {
        include: { user: { select: { fullName: true, email: true, isActive: true } } },
      },
    },
  });

  if (!branch) notFound();

  const history = await prisma.auditLog.findMany({
    where: { resource: "sugg_branch", resourceId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, action: true, oldValue: true, newValue: true, createdAt: true, user: { select: { fullName: true, email: true } } },
  });

  const territories: TerritoryRow[] = branch.territories.map((t) => ({
    id: t.id,
    countryName: t.geoCountry.countryName,
    stateName: t.geoState?.stateName ?? null,
    districtName: t.geoDistrict?.districtName ?? null,
  }));

  const location =
    [branch.geoDistrict?.districtName, branch.geoState?.stateName, branch.geoCountry?.countryName]
      .filter(Boolean)
      .join(", ") || "—";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
          <Link href="/admin/sugg-branches">
            <ArrowLeft className="w-4 h-4" /> Back to Sugg Branches
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href={`/admin/sugg-branches/${branch.id}/edit`}>
            <Pencil className="w-4 h-4" /> Edit
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{branch.branchName}</h1>
            <p className="text-sm text-muted-foreground">{branch.branchCode}</p>
          </div>
        </div>
        <Badge variant={statusVariant[branch.status] ?? "secondary"}>{branch.status}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Info */}
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h2 className="font-semibold">Branch details</h2>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" /> {location}
              </div>
              {branch.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" /> {branch.email}
                </div>
              )}
              {branch.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" /> {branch.phone}
                </div>
              )}
              {branch.address && (
                <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                  <Building2 className="w-4 h-4" /> {branch.address}
                </div>
              )}
            </div>
            {branch.manager && (
              <div className="border-t pt-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Manager</p>
                <p className="font-medium">{branch.manager.fullName}</p>
                <p className="text-muted-foreground">{branch.manager.email}</p>
              </div>
            )}
          </div>

          {/* Territories */}
          <TerritoryManager suggBranchId={branch.id} territories={territories} />

          {/* Agencies in territory */}
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold">Agencies in territory</h2>
              <span className="text-xs text-muted-foreground">({branch.agencies.length})</span>
            </div>
            {branch.agencies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No agencies assigned to this branch yet.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {branch.agencies.map((a) => (
                  <li key={a.id} className="flex items-center justify-between px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a._count.branches} branches</p>
                    </div>
                    <Badge variant={approvalVariant[a.approvalStatus] ?? "secondary"}>
                      {a.approvalStatus}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sugg counselors */}
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold">Sugg counselors</h2>
              <span className="text-xs text-muted-foreground">({branch.counselors.length})</span>
            </div>
            {branch.counselors.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No Sugg counselors assigned.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {branch.counselors.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{c.user.email}</p>
                    </div>
                    <Badge variant={c.user.isActive ? "success" : "secondary"}>
                      {c.user.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ChangeHistory entries={history} />
        </div>

        {/* Settings sidebar */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-2xl font-bold">{branch.territories.length}</p>
              <p className="text-xs text-muted-foreground">Territories</p>
            </div>
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-2xl font-bold">{branch.agencies.length}</p>
              <p className="text-xs text-muted-foreground">Agencies</p>
            </div>
          </div>
          <BranchSettings
            suggBranchId={branch.id}
            managerId={branch.managerId}
            status={branch.status}
          />
        </div>
      </div>
    </div>
  );
}
