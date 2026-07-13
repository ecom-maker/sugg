import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSuggBranchScope } from "@/lib/sugg-branch-scope";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";

export const metadata: Metadata = { title: "Branch Agencies" };

const approvalVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  APPROVED: "success", PENDING: "warning", REJECTED: "destructive", SUSPENDED: "secondary", ARCHIVED: "secondary",
};

// Agencies mapped under this Sugg Branch. Visible to Branch Managers only (read-only).
export default async function BranchAgenciesPage() {
  const user = await requireRole(["SUGG_BRANCH_MANAGER", "SUPER_ADMIN"]);
  const scope = await getSuggBranchScope(user);

  const agencies = scope
    ? await prisma.agency.findMany({
        where: { suggBranchId: scope.suggBranchId },
        orderBy: { name: "asc" },
        include: {
          geoState: { select: { stateName: true } },
          _count: { select: { branches: true, agencyUsers: true } },
        },
      })
    : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agencies</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {scope ? `${agencies.length} agencies mapped under ${scope.branchName} · read-only` : "No Sugg Branch assigned to you yet."}
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Agency</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Location</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Branches</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Staff</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {agencies.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />No agencies mapped to this branch.
              </td></tr>
            ) : agencies.map((a) => (
              <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="font-medium">{a.name}</p>
                  {a.email && <p className="text-xs text-muted-foreground">{a.email}</p>}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                  {[a.city, a.geoState?.stateName].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{a._count.branches}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{a._count.agencyUsers}</td>
                <td className="px-4 py-3"><Badge variant={approvalVariant[a.approvalStatus] ?? "secondary"}>{a.approvalStatus}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
