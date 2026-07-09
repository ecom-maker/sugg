import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole(["SUPER_ADMIN"]);

  const flags = await prisma.studentDuplicateFlag.findMany({
    where: { status: "PENDING" },
    include: {
      studentA: {
        select: {
          id: true, name: true, mobile: true, email: true, source: true,
          leads: { where: { isCurrent: true }, take: 1, select: { status: true, score: true } },
          _count: { select: { applications: true, documents: true } },
        },
      },
      studentB: {
        select: {
          id: true, name: true, mobile: true, email: true, source: true,
          leads: { where: { isCurrent: true }, take: 1, select: { status: true, score: true } },
          _count: { select: { applications: true, documents: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ duplicates: flags });
}
