import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHierarchyScope } from "@/lib/hierarchy-scope";
import { TeamForm } from "@/components/teams/team-form";

export const metadata: Metadata = { title: "Create Team" };

export default async function CreateTeamPage() {
  const user = await requireRole(["AGENCY_OWNER", "AGENCY_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN"]);
  const scope = await getHierarchyScope(user);

  const branches = await prisma.agencyBranch.findMany({
    where: {
      status: "ACTIVE",
      ...(scope.branchId ? { id: scope.branchId } : {}),
      ...(scope.agencyId && !scope.branchId ? { agencyId: scope.agencyId } : {}),
    },
    include: { geoDistrict: { select: { districtName: true } } },
    orderBy: { branchName: "asc" },
  });

  return (
    <div className="p-6">
      <TeamForm branches={branches} />
    </div>
  );
}
