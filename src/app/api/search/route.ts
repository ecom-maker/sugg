import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgencyLeadWhere } from "@/lib/agency-access";
import { getSuggBranchScope, scopedLeadWhere } from "@/lib/sugg-branch-scope";
import type { AuthUser } from "@/types";

const NONE: Prisma.LeadWhereInput = { id: "__none__" };
const AGENCY_ROLES = ["AGENCY_OWNER", "AGENCY_ADMIN", "BRANCH_MANAGER", "AGENCY_COUNSELOR"];

// Which leads this user may find, mirroring the app's per-role lead scoping.
async function leadScope(user: AuthUser): Promise<Prisma.LeadWhereInput> {
  if (user.role === "SUPER_ADMIN") return {};
  if (user.role === "SUGG_COUNSELOR") return { assignedToId: user.id };
  if (user.role === "SUGG_BRANCH_MANAGER") {
    const scope = await getSuggBranchScope(user);
    return scope ? await scopedLeadWhere(scope.suggBranchId) : NONE;
  }
  if (AGENCY_ROLES.includes(user.role)) return (await getAgencyLeadWhere(user)) as Prisma.LeadWhereInput;
  return NONE;
}

type LeadRow = { id: string; student: { name: string; mobile: string } };
type AppRow = { id: string; status: string; student: { name: string } };

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ leads: [], colleges: [], applications: [] });

  const ci = "insensitive" as const;
  const studentSearch: Prisma.StudentWhereInput = {
    OR: [
      { name: { contains: q, mode: ci } },
      { mobile: { contains: q } },
      { email: { contains: q, mode: ci } },
    ],
  };

  const isCollege = user.role === "COLLEGE_ADMIN";
  const leadWhere = isCollege ? NONE : await leadScope(user);

  // Lead detail routes differ by role; college admins have no lead detail.
  const leadHref = (id: string) =>
    (user.role === "AGENCY_OWNER" || user.role === "AGENCY_ADMIN" || user.role === "BRANCH_MANAGER")
      ? `/agency/leads/${id}`
      : `/counselor/leads/${id}`;

  const leadsP: Promise<LeadRow[]> = isCollege
    ? Promise.resolve([])
    : prisma.lead.findMany({
        where: { AND: [leadWhere, { student: studentSearch }, { isCurrent: true }] },
        take: 6,
        orderBy: { updatedAt: "desc" },
        select: { id: true, student: { select: { name: true, mobile: true } } },
      });

  const collegesP = prisma.college.findMany({
    where: { status: "APPROVED", OR: [{ name: { contains: q, mode: ci } }, { city: { contains: q, mode: ci } }] },
    take: 6,
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true, country: true },
  });

  const appsP: Promise<AppRow[]> = isCollege
    ? prisma.application.findMany({
        where: { AND: [{ college: { admin: { supabaseId: user.supabaseId } } }, { student: { name: { contains: q, mode: ci } } }] },
        take: 6,
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, student: { select: { name: true } } },
      })
    : Promise.resolve([]);

  const [leads, colleges, applications] = await Promise.all([leadsP, collegesP, appsP]);

  return NextResponse.json({
    leads: leads.map((l) => ({ id: l.id, title: l.student.name, subtitle: l.student.mobile, href: leadHref(l.id) })),
    colleges: colleges.map((c) => ({ id: c.id, title: c.name, subtitle: [c.city, c.country].filter(Boolean).join(", "), href: `/colleges/${c.id}` })),
    applications: applications.map((a) => ({ id: a.id, title: a.student.name, subtitle: a.status.replace(/_/g, " "), href: "/college/applications" })),
  });
}
