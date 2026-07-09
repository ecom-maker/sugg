import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHierarchyScope } from "@/lib/hierarchy-scope";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Teams" };

export default async function AgencyTeamsPage() {
  const user = await requireRole(["AGENCY_OWNER", "AGENCY_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN"]);
  const scope = await getHierarchyScope(user);

  const teams = await prisma.team.findMany({
    where: {
      status: { not: "ARCHIVED" },
      ...(scope.branchId ? { branchId: scope.branchId } : {}),
      ...(scope.agencyId && !scope.branchId
        ? { branch: { agencyId: scope.agencyId } }
        : {}),
    },
    include: {
      branch: { select: { branchName: true } },
      district: { select: { districtName: true } },
      teamLead: { include: { user: { select: { fullName: true } } } },
      _count: { select: { members: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { teamName: "asc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-muted-foreground text-sm">{teams.length} active teams</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/agency/teams/create"><Plus className="w-4 h-4" />Create Team</Link>
        </Button>
      </div>

      {teams.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl py-16 text-center text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No teams created yet</p>
          <p className="text-sm mt-1">Teams group counselors within a single district and branch</p>
          <Button asChild className="mt-4"><Link href="/agency/teams/create">Create First Team</Link></Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((t) => (
            <Link key={t.id} href={`/agency/teams/${t.id}`} className="border rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{t.teamName}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.branch.branchName} · {t.district.districtName}
                  </p>
                </div>
                <Badge variant={t.status === "ACTIVE" ? "success" : "secondary"}>{t.status}</Badge>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>{t._count.members} members</span>
                {t.teamLead && <span>Lead: {t.teamLead.user.fullName}</span>}
                {t.needsReview && <span className="text-amber-600">Needs review</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
