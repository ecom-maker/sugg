import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getHierarchyScope } from "@/lib/hierarchy-scope";

/**
 * GET /api/agency/onboarding-status
 * Completion state of the agency setup checklist for the signed-in agency user.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = await getHierarchyScope(user);
  if (!scope.agencyId) return NextResponse.json({ error: "No agency context" }, { status: 404 });

  const agencyId = scope.agencyId;
  const [agency, branchCount, counselorCount, teamCount, leadCount] = await Promise.all([
    prisma.agency.findUnique({ where: { id: agencyId }, select: { specialization: true, logoUrl: true } }),
    prisma.agencyBranch.count({ where: { agencyId } }),
    prisma.agencyUser.count({ where: { agencyId, user: { role: "AGENCY_COUNSELOR" } } }),
    prisma.team.count({ where: { branch: { agencyId } } }),
    prisma.lead.count({ where: { student: { agencyId } } }),
  ]);

  const steps = [
    {
      key: "profile",
      label: "Complete agency profile (logo & specialization)",
      done: Boolean(agency && agency.specialization.length > 0),
      href: "/agency/profile",
    },
    { key: "branches", label: "Add branches (or use Head Office)", done: branchCount > 0, href: "/agency/branches" },
    { key: "counselors", label: "Add counselors", done: counselorCount > 0, href: "/agency/counselors" },
    { key: "teams", label: "Create teams", done: teamCount > 0, href: "/agency/teams" },
    { key: "lead", label: "Add your first student lead", done: leadCount > 0, href: "/agency/leads/create" },
  ];

  const completed = steps.filter((s) => s.done).length;
  return NextResponse.json({ steps, completed, total: steps.length });
}
