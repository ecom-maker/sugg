import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Globe, Mail, Plus, GitBranch } from "lucide-react";

export const metadata: Metadata = { title: "Agencies" };

const approvalVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "destructive",
  SUSPENDED: "secondary",
};

export default async function AdminAgenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ unassigned?: string }>;
}) {
  await requireRole(["SUPER_ADMIN"]);
  const { unassigned } = await searchParams;
  const unassignedOnly = unassigned === "true";

  const agencies = await prisma.agency.findMany({
    where: unassignedOnly ? { suggBranchId: null } : {},
    orderBy: { createdAt: "desc" },
    include: {
      suggBranch: { select: { id: true, branchName: true } },
      _count: { select: { agencyUsers: true, commissions: true, branches: true } },
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agencies</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {agencies.length} {unassignedOnly ? "unassigned-territory " : "partner "}agencies
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/admin/agencies/new">
            <Plus className="w-4 h-4" /> New Agency
          </Link>
        </Button>
      </div>

      <div className="flex gap-1 border-b">
        <Link
          href="/admin/agencies"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            !unassignedOnly ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          }`}
        >
          All
        </Link>
        <Link
          href="/admin/agencies?unassigned=true"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            unassignedOnly ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          }`}
        >
          Unassigned territory
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agencies.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground border rounded-lg">
            {unassignedOnly ? "No unassigned agencies." : "No agencies yet."}
          </div>
        ) : (
          agencies.map((agency) => (
            <Link
              key={agency.id}
              href={`/admin/agencies/${agency.id}`}
              className="rounded-lg border bg-card p-4 space-y-3 hover:border-primary/50 hover:shadow-sm transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{agency.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {agency.city ?? ""}
                    {agency.country ? `, ${agency.country}` : ""}
                  </p>
                </div>
                <Badge variant={approvalVariant[agency.approvalStatus] ?? "secondary"}>
                  {agency.approvalStatus}
                </Badge>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                {agency.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3" /> {agency.email}
                  </div>
                )}
                {agency.website && (
                  <div className="flex items-center gap-2 truncate">
                    <Globe className="w-3 h-3 shrink-0" /> {agency.website}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <GitBranch className="w-3 h-3 shrink-0" />
                  {agency.suggBranch ? (
                    <span>{agency.suggBranch.branchName}</span>
                  ) : (
                    <span className="text-amber-600">Unassigned territory</span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t flex justify-between text-xs text-muted-foreground">
                <span>{agency._count.branches} branches</span>
                <span>{agency._count.agencyUsers} staff</span>
                <span>{agency._count.commissions} commissions</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
