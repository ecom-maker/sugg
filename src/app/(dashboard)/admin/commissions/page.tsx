import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommissionsManagementPage } from "@/components/dashboard/admin/commissions-management";

export const metadata: Metadata = { title: "Commission Management" };

export default async function AdminCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireRole(["SUPER_ADMIN"]);
  const params = await searchParams;

  const page = Number(params.page ?? 1);
  const limit = 20;

  const where = {
    ...(params.status ? { status: params.status as never } : {}),
  };

  const [transactions, total, summaryStats] = await Promise.all([
    prisma.commissionTransaction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        application: {
          include: {
            student: { select: { name: true, mobile: true } },
            course: { select: { name: true } },
          },
        },
        agency: { select: { name: true } },
        college: { select: { name: true } },
      },
    }),
    prisma.commissionTransaction.count({ where }),
    prisma.commissionTransaction.groupBy({
      by: ["status"],
      _sum: { commissionAmount: true },
      _count: { id: true },
    }),
  ]);

  return (
    <CommissionsManagementPage
      transactions={transactions}
      total={total}
      page={page}
      limit={limit}
      searchParams={params}
      summaryStats={summaryStats}
    />
  );
}
