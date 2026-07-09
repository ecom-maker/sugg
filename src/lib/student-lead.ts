import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const currentLeadInclude = {
  where: { isCurrent: true },
  take: 1,
} as const;

export function getCurrentLead<T extends { leads?: Array<Record<string, unknown>> }>(
  student: T
): T["leads"] extends Array<infer L> ? L | undefined : undefined {
  const leads = student.leads;
  if (!leads?.length) return undefined as never;
  return (leads.find((l) => (l as { isCurrent?: boolean }).isCurrent !== false) ?? leads[0]) as never;
}

export async function getCurrentLeadRecord(studentId: string) {
  return prisma.lead.findFirst({
    where: { studentId, isCurrent: true },
    orderBy: { createdAt: "desc" },
  });
}

export const studentWithCurrentLead = {
  include: {
    leads: {
      where: { isCurrent: true },
      take: 1,
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
        followups: {
          where: { status: "PENDING" },
          orderBy: { dueAt: "asc" as const },
          take: 1,
        },
      },
    },
  },
} satisfies { include: Prisma.StudentInclude };
