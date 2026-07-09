import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UniversitiesManagement } from "@/components/university/universities-management";

export const metadata: Metadata = { title: "Universities" };

export default async function AdminUniversitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    country?: string;
    status?: string;
    sortBy?: string;
    order?: string;
    page?: string;
  }>;
}) {
  const user = await requireRole(["SUPER_ADMIN", "COLLEGE_ADMIN"]);
  const params = await searchParams;
  const canManage = user.role === "SUPER_ADMIN";

  const page = Math.max(1, Number(params.page ?? 1));
  const limit = 20;
  const sortBy = params.sortBy ?? "name";
  const order = params.order === "desc" ? "desc" : "asc";

  const where: Record<string, unknown> = {};
  if (params.q) where.name = { contains: params.q, mode: "insensitive" };
  if (params.country) where.country = { contains: params.country, mode: "insensitive" };
  if (params.status) where.status = params.status;

  const orderBy: Record<string, unknown> =
    sortBy === "year"
      ? { establishmentYear: order }
      : sortBy === "colleges"
      ? { colleges: { _count: order } }
      : { name: order };

  const [universities, total] = await Promise.all([
    prisma.university.findMany({
      where: where as never,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { colleges: true } } },
    }),
    prisma.university.count({ where: where as never }),
  ]);

  return (
    <div className="p-6">
      <UniversitiesManagement
        universities={universities}
        total={total}
        page={page}
        limit={limit}
        searchParams={params}
        canManage={canManage}
      />
    </div>
  );
}
