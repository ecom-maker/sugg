import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CollegesManagementPage } from "@/components/dashboard/admin/colleges-management";

export const metadata: Metadata = { title: "Manage Colleges" };

const listSelect = {
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
} as const;

const normalize = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export default async function AdminCollegesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  await requireRole(["SUPER_ADMIN"]);
  const params = await searchParams;

  const page = Number(params.page ?? 1);
  const limit = 20;

  // Status scope only — search is applied below (tokenized + punctuation-insensitive).
  const where = params.status
    ? { status: params.status as never }
    : { status: { not: "ARCHIVED" as never } };

  const search = params.search?.trim();
  let pageIds: string[] = [];
  let total = 0;

  if (search) {
    // Match on name / city / email ignoring case, punctuation and word order:
    // "PK DAS LIBERAL" finds "P.K Das Liberal College of Arts and Science".
    const tokens = search
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9]/g, ""))
      .filter(Boolean);

    const candidates = await prisma.college.findMany({
      where,
      select: { id: true, name: true, city: true, officialEmail: true },
      orderBy: { createdAt: "desc" },
    });

    const matched = tokens.length
      ? candidates.filter((c) => {
          const hay = normalize(`${c.name} ${c.city ?? ""} ${c.officialEmail}`);
          return tokens.every((t) => hay.includes(t));
        })
      : candidates;

    total = matched.length;
    pageIds = matched.slice((page - 1) * limit, page * limit).map((c) => c.id);
  } else {
    const [ordered, count] = await Promise.all([
      prisma.college.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: { id: true },
      }),
      prisma.college.count({ where }),
    ]);
    pageIds = ordered.map((c) => c.id);
    total = count;
  }

  const fetched = pageIds.length
    ? await prisma.college.findMany({ where: { id: { in: pageIds } }, select: listSelect })
    : [];
  const orderMap = new Map(pageIds.map((id, i) => [id, i]));
  const colleges = fetched.slice().sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

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
