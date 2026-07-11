import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Plus, AlertTriangle } from "lucide-react";

export const metadata: Metadata = { title: "Sugg Branches" };

const statusVariant: Record<string, "success" | "secondary" | "outline"> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  ARCHIVED: "outline",
};

export default async function SuggBranchesPage() {
  await requireRole(["SUPER_ADMIN"]);

  const [branches, unassignedAgencies] = await Promise.all([
    prisma.suggBranch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        manager: { select: { fullName: true } },
        geoCountry: { select: { countryName: true } },
        geoState: { select: { stateName: true } },
        _count: { select: { territories: true, agencies: true } },
      },
    }),
    prisma.agency.count({ where: { suggBranchId: null } }),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sugg Branches</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sugg-operated regional offices managing partner agencies in their territory
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/admin/sugg-branches/new">
            <Plus className="w-4 h-4" /> New Branch
          </Link>
        </Button>
      </div>

      {unassignedAgencies > 0 && (
        <Link
          href="/admin/agencies?unassigned=true"
          className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100 transition-colors"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <span className="font-medium">{unassignedAgencies}</span> agenc
            {unassignedAgencies === 1 ? "y is" : "ies are"} in an unassigned territory — not covered by
            any Sugg Branch.
          </span>
        </Link>
      )}

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Code</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">Manager</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Location</th>
              <th className="px-4 py-3 font-medium text-center">Territories</th>
              <th className="px-4 py-3 font-medium text-center">Agencies</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {branches.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No Sugg Branches yet. Create your first regional office.
                </td>
              </tr>
            ) : (
              branches.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/admin/sugg-branches/${b.id}`} className="font-medium text-primary hover:underline">
                      {b.branchName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{b.branchCode}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {b.manager?.fullName ?? <span className="italic">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {[b.geoState?.stateName, b.geoCountry?.countryName].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">{b._count.territories}</td>
                  <td className="px-4 py-3 text-center">{b._count.agencies}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[b.status] ?? "secondary"}>{b.status}</Badge>
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
