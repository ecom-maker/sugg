import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Mail, Phone, Globe, MapPin, Building2, Hash } from "lucide-react";
import { MapToBranch } from "@/components/agencies/map-to-branch";

export const metadata: Metadata = { title: "Agency" };

const approvalVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "destructive",
  SUSPENDED: "secondary",
};

export default async function AgencyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["SUPER_ADMIN"]);
  const { id } = await params;

  const agency = await prisma.agency.findUnique({
    where: { id },
    include: {
      suggBranch: { select: { id: true, branchName: true } },
      geoCountry: { select: { countryName: true } },
      geoState: { select: { stateName: true } },
      geoDistrict: { select: { districtName: true } },
      owner: { select: { fullName: true, email: true } },
      branches: {
        orderBy: { branchName: "asc" },
        select: { id: true, branchName: true, branchCode: true, status: true, city: true },
      },
      _count: { select: { branches: true, agencyUsers: true, commissions: true } },
    },
  });

  if (!agency) notFound();

  const location =
    [agency.geoDistrict?.districtName, agency.geoState?.stateName, agency.geoCountry?.countryName]
      .filter(Boolean)
      .join(", ") ||
    [agency.city, agency.country].filter(Boolean).join(", ") ||
    "—";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
          <Link href="/admin/agencies">
            <ArrowLeft className="w-4 h-4" /> Back to Agencies
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href={`/admin/agencies/${agency.id}/edit`}>
            <Pencil className="w-4 h-4" /> Edit
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-purple-50 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{agency.name}</h1>
            <p className="text-sm text-muted-foreground">{agency.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={approvalVariant[agency.approvalStatus] ?? "secondary"}>
            {agency.approvalStatus}
          </Badge>
          <Badge variant={agency.isActive ? "success" : "secondary"}>
            {agency.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h2 className="font-semibold">Agency details</h2>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              {agency.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" /> {agency.email}
                </div>
              )}
              {agency.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" /> {agency.phone}
                </div>
              )}
              {agency.website && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="w-4 h-4" /> {agency.website}
                </div>
              )}
              {agency.registrationNumber && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Hash className="w-4 h-4" /> {agency.registrationNumber}
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                <MapPin className="w-4 h-4" /> {location}
              </div>
              {agency.address && (
                <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                  <Building2 className="w-4 h-4" /> {agency.address}
                </div>
              )}
            </div>
            {agency.owner && (
              <div className="border-t pt-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Owner</p>
                <p className="font-medium">{agency.owner.fullName}</p>
                <p className="text-muted-foreground">{agency.owner.email}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold">Agency branches</h2>
              <span className="text-xs text-muted-foreground">({agency.branches.length})</span>
            </div>
            {agency.branches.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No branches yet.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {agency.branches.map((b) => (
                  <li key={b.id} className="flex items-center justify-between px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.branchName}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.branchCode}
                        {b.city ? ` · ${b.city}` : ""}
                      </p>
                    </div>
                    <Badge variant={b.status === "ACTIVE" ? "success" : "secondary"}>{b.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-2xl font-bold">{agency._count.branches}</p>
              <p className="text-xs text-muted-foreground">Branches</p>
            </div>
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-2xl font-bold">{agency._count.agencyUsers}</p>
              <p className="text-xs text-muted-foreground">Staff</p>
            </div>
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-2xl font-bold">{agency._count.commissions}</p>
              <p className="text-xs text-muted-foreground">Commissions</p>
            </div>
          </div>
          <MapToBranch agencyId={agency.id} currentBranchId={agency.suggBranchId} />
        </div>
      </div>
    </div>
  );
}
