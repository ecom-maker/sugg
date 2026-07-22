import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadsPage } from "@/components/dashboard/counselor/leads-page";
import type { LeadStatus } from "@/types";

export const metadata: Metadata = { title: "My Leads" };

export default async function CounselorLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const user = await requireRole(["SUGG_COUNSELOR", "AGENCY_COUNSELOR", "SUPER_ADMIN"]);
  const params = await searchParams;

  const page = Number(params.page ?? 1);
  const limit = 20;
  const skip = (page - 1) * limit;

  // My Leads shows all of the counsellor's leads; leads with a scheduled
  // follow-up also appear under Follow-ups.
  const baseWhere = {
    ...(user.role === "SUGG_COUNSELOR" || user.role === "AGENCY_COUNSELOR" ? { assignedToId: user.id } : {}),
    ...(params.search
      ? {
          student: {
            OR: [
              { name: { contains: params.search, mode: "insensitive" as const } },
              { mobile: { contains: params.search } },
              { email: { contains: params.search, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };
  // The status filter applies to the paginated list only — the board shows every
  // status as its own column, so it ignores the filter.
  const listWhere = {
    ...baseWhere,
    ...(params.status ? { status: params.status as never } : {}),
  };

  const [leads, total, boardRows] = await Promise.all([
    prisma.lead.findMany({
      where: listWhere,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            mobile: true,
            email: true,
            city: true,
            interestedCourse: true,
            source: true,
          },
        },
        assignedTo: {
          select: { fullName: true },
        },
        _count: {
          select: { notes: true, followups: true },
        },
      },
    }),
    prisma.lead.count({ where: listWhere }),
    prisma.lead.findMany({
      where: baseWhere,
      take: 300,
      orderBy: { updatedAt: "desc" },
      include: {
        student: { select: { name: true, mobile: true, interestedCourse: true } },
        assignedTo: { select: { fullName: true } },
      },
    }),
  ]);

  const boardLeads = boardRows.map((l) => ({
    id: l.id,
    code: l.code,
    status: l.status as LeadStatus,
    name: l.student.name,
    mobile: l.student.mobile,
    subtitle: l.student.interestedCourse,
    assignedTo: l.assignedTo?.fullName ?? null,
    href: `/counselor/leads/${l.id}`,
  }));

  return (
    <LeadsPage
      leads={leads}
      boardLeads={boardLeads}
      total={total}
      page={page}
      limit={limit}
      searchParams={params}
    />
  );
}
