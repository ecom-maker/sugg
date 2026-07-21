import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboard } from "@/components/dashboard/admin/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

export default async function AdminPage() {
  await requireRole(["SUPER_ADMIN"]);

  const [
    totalLeads,
    newLeads,
    confirmedAdmissions,
    totalColleges,
    approvedColleges,
    totalAgencies,
    totalStudents,
    pendingCommissions,
    totalCommissionAmount,
    totalUniversities,
    activeUniversities,
    universitiesThisMonth,
    collegesThisMonth,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.count({ where: { status: "ADMISSION_CONFIRMED" } }),
    prisma.college.count(),
    prisma.college.count({ where: { status: "APPROVED" } }),
    prisma.agency.count(),
    prisma.student.count(),
    prisma.commissionTransaction.count({ where: { status: "PENDING" } }),
    prisma.commissionTransaction.aggregate({
      _sum: { commissionAmount: true },
      where: { status: "APPROVED" },
    }),
    prisma.university.count(),
    prisma.university.count({ where: { status: "ACTIVE" } }),
    prisma.university.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    prisma.college.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  const stats = {
    totalLeads,
    newLeads,
    confirmedAdmissions,
    totalColleges,
    approvedColleges,
    totalAgencies,
    totalStudents,
    pendingCommissions,
    totalCommissionAmount: Number(totalCommissionAmount._sum.commissionAmount ?? 0),
    totalUniversities,
    activeUniversities,
    universitiesThisMonth,
    collegesThisMonth,
  };

  return <AdminDashboard stats={stats} />;
}
