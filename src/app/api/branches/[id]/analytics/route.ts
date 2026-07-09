import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: branchId } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get("months") ?? "6");

    const now = new Date();
    const monthlyData = await Promise.all(
      Array.from({ length: months }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        return { year: d.getFullYear(), month: d.getMonth() + 1 };
      }).reverse().map(async ({ year, month }) => {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59);
        const [leads, admissions, commissions] = await Promise.all([
          prisma.lead.count({ where: { branchId, createdAt: { gte: start, lte: end } } }),
          prisma.application.count({ where: { branchId, status: "ENROLLED", enrolledAt: { gte: start, lte: end } } }),
          prisma.commissionTransaction.aggregate({ where: { branchId, createdAt: { gte: start, lte: end } }, _sum: { commissionAmount: true } }),
        ]);
        return {
          month: `${year}-${String(month).padStart(2, "0")}`,
          leads,
          admissions,
          commission: Number(commissions._sum.commissionAmount ?? 0),
          conversionRate: leads > 0 ? Math.round((admissions / leads) * 100) : 0,
        };
      })
    );

    const totals = await Promise.all([
      prisma.lead.count({ where: { branchId } }),
      prisma.application.count({ where: { branchId, status: "ENROLLED" } }),
      prisma.commissionTransaction.aggregate({ where: { branchId }, _sum: { commissionAmount: true } }),
      prisma.agencyUser.count({ where: { branchId } }),
      prisma.student.count({ where: { branchId } }),
    ]);

    return NextResponse.json({
      monthly: monthlyData,
      totals: {
        leads: totals[0],
        admissions: totals[1],
        commission: Number(totals[2]._sum.commissionAmount ?? 0),
        counselors: totals[3],
        students: totals[4],
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
