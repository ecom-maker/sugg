import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadsPage } from "@/components/dashboard/counselor/leads-page";

export const metadata: Metadata = { title: "My Leads" };

export default async function CounselorLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const user = await requireRole(["SUGG_COUNSELOR", "SUPER_ADMIN"]);
  const params = await searchParams;

  const page = Number(params.page ?? 1);
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(user.role === "SUGG_COUNSELOR" ? { assignedToId: user.id } : {}),
    ...(params.status ? { status: params.status as never } : {}),
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

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
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
    prisma.lead.count({ where }),
  ]);

  return (
    <LeadsPage
      leads={leads}
      total={total}
      page={page}
      limit={limit}
      searchParams={params}
    />
  );
}
