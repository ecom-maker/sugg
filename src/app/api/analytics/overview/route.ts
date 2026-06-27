import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";

export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = startOfDay(new Date());
  const thirtyDaysAgo = subDays(today, 30);

  const [
    totalLeads,
    leadsThisMonth,
    admissionsThisMonth,
    counselorPerformance,
    collegePerformance,
    leadsByStatus,
    leadsBySource,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.lead.count({
      where: { status: "ADMISSION_CONFIRMED", updatedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.user.findMany({
      where: { role: "SUGG_COUNSELOR", isActive: true },
      select: {
        id: true,
        fullName: true,
        _count: {
          select: {
            assignedLeads: {
              where: { status: "ADMISSION_CONFIRMED" },
            },
          },
        },
      },
      take: 10,
    }),
    prisma.college.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        name: true,
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { applications: { _count: "desc" } },
      take: 10,
    }),
    prisma.lead.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.student.groupBy({
      by: ["source"],
      _count: { id: true },
    }),
  ]);

  return NextResponse.json({
    summary: {
      totalLeads,
      leadsThisMonth,
      admissionsThisMonth,
      conversionRate:
        totalLeads > 0
          ? ((admissionsThisMonth / leadsThisMonth) * 100).toFixed(1)
          : 0,
    },
    counselorPerformance: counselorPerformance.map((c) => ({
      id: c.id,
      name: c.fullName,
      admissions: c._count.assignedLeads,
    })),
    collegePerformance: collegePerformance.map((c) => ({
      id: c.id,
      name: c.name,
      applications: c._count.applications,
    })),
    leadsByStatus,
    leadsBySource,
  });
}
