import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CollegesManagementPage } from "@/components/dashboard/admin/colleges-management";

export const metadata: Metadata = { title: "Manage Colleges" };

export default async function AdminCollegesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  await requireRole(["SUPER_ADMIN"]);
  const params = await searchParams;

  const page = Number(params.page ?? 1);
  const limit = 20;

  const where = {
    // Hide archived colleges from the default list; still reachable via an
    // explicit ?status=ARCHIVED filter.
    ...(params.status ? { status: params.status as never } : { status: { not: "ARCHIVED" as never } }),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" as const } },
            { city: { contains: params.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [colleges, total] = await Promise.all([
    prisma.college.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        officialEmail: true,
        contactPersonName: true,
        contactPersonDesig: true,
        status: true,
        isVerified: true,
        emailVerified: true,
        createdAt: true,
        university: { select: { id: true, name: true } },
        _count: { select: { courses: true, applications: true } },
      },
    }),
    prisma.college.count({ where }),
  ]);

  return (
    <CollegesManagementPage
      colleges={colleges}
      total={total}
      page={page}
      limit={limit}
      searchParams={params}
    />
  );
}
