import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: branchId } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format"); // "json" | "csv"

    const [leads, applications, commissions, followups, lostLeads, pending] = await Promise.all([
      prisma.lead.findMany({ where: { branchId }, include: { student: { select: { name: true, mobile: true } }, assignedTo: { select: { fullName: true } } } }),
      prisma.application.findMany({ where: { branchId }, include: { student: { select: { name: true } }, college: { select: { name: true } }, course: { select: { name: true } } } }),
      prisma.commissionTransaction.findMany({ where: { branchId }, include: { application: { include: { student: { select: { name: true } } } }, counselor: { select: { fullName: true } } } }),
      prisma.leadFollowup.count({ where: { lead: { branchId }, status: { not: "COMPLETED" } } }),
      prisma.lead.count({ where: { branchId, status: "LOST" } }),
      prisma.application.count({ where: { branchId, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    ]);

    const report = {
      summary: {
        totalLeads: leads.length,
        totalAdmissions: applications.filter(a => a.status === "ENROLLED").length,
        totalRevenue: commissions.filter(c => c.status === "PAID").reduce((s, c) => s + Number(c.commissionAmount), 0),
        totalCommissions: commissions.reduce((s, c) => s + Number(c.commissionAmount), 0),
        pendingFollowups: followups,
        lostLeads,
        pendingApplications: pending,
      },
      leads: leads.map(l => ({
        student: l.student.name,
        mobile: l.student.mobile,
        counselor: l.assignedTo?.fullName ?? "Unassigned",
        status: l.status,
        date: l.createdAt,
      })),
      applications: applications.map(a => ({
        student: a.student.name,
        college: a.college.name,
        course: a.course.name,
        status: a.status,
        date: a.createdAt,
      })),
      commissions: commissions.map(c => ({
        student: c.application.student.name,
        counselor: c.counselor?.fullName ?? "—",
        amount: Number(c.commissionAmount),
        status: c.status,
        date: c.createdAt,
      })),
    };

    if (format === "csv") {
      const csvLines = [
        "Type,Student,Detail,Status,Amount,Date",
        ...report.leads.map(l => `Lead,${l.student},Counselor: ${l.counselor},${l.status},,${new Date(l.date).toLocaleDateString()}`),
        ...report.applications.map(a => `Application,${a.student},${a.college} - ${a.course},${a.status},,${new Date(a.date).toLocaleDateString()}`),
        ...report.commissions.map(c => `Commission,${c.student},${c.counselor},${c.status},${c.amount},${new Date(c.date).toLocaleDateString()}`),
      ].join("\n");

      return new NextResponse(csvLines, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="branch-report-${branchId}.csv"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
