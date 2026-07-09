import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { TeamDetailView } from "@/components/teams/team-detail";

export const metadata: Metadata = { title: "Team Details" };

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["AGENCY_OWNER", "AGENCY_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN"]);
  const { id } = await params;
  const canManage = ["AGENCY_OWNER", "AGENCY_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN"].includes(user.role);

  return (
    <div className="p-6 max-w-4xl">
      <TeamDetailView teamId={id} canManage={canManage} />
    </div>
  );
}
