import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AgencyDashboard } from "@/components/dashboard/agency/agency-dashboard";

export const metadata: Metadata = { title: "Agency Dashboard" };

export default async function AgencyPage() {
  const user = await requireRole(["AGENCY_OWNER", "AGENCY_ADMIN", "AGENCY_COUNSELOR", "SUPER_ADMIN"]);

  // Redirect to role-specific dashboards
  if (user.role === "AGENCY_OWNER") redirect("/agency/owner");
  if (user.role === "AGENCY_ADMIN") redirect("/agency/admin");

  const agency = await prisma.agency.findFirst({
    where: { agencyUsers: { some: { user: { supabaseId: user.supabaseId } } } },
  });

  const agencyId = agency?.id;

  const [
    totalReferrals,
    activeStudents,
    convertedStudents,
    totalCommission,
    pendingCommission,
    paidCommission,
  ] = await Promise.all([
    prisma.studentReferral.count({
      where: agencyId ? { agencyId } : {},
    }),
    prisma.studentReferral.count({
      where: {
        ...(agencyId ? { agencyId } : {}),
        student: {
          lead: {
            status: { notIn: ["ADMISSION_CONFIRMED", "LOST"] },
          },
        },
      },
    }),
    prisma.studentReferral.count({
      where: {
        ...(agencyId ? { agencyId } : {}),
        student: {
          lead: { status: "ADMISSION_CONFIRMED" },
        },
      },
    }),
    prisma.commissionTransaction.aggregate({
      _sum: { commissionAmount: true },
      where: { ...(agencyId ? { agencyId } : {}) },
    }),
    prisma.commissionTransaction.aggregate({
      _sum: { commissionAmount: true },
      where: { ...(agencyId ? { agencyId } : {}), status: "PENDING" },
    }),
    prisma.commissionTransaction.aggregate({
      _sum: { commissionAmount: true },
      where: { ...(agencyId ? { agencyId } : {}), status: "PAID" },
    }),
  ]);

  const stats = {
    totalReferrals,
    activeStudents,
    convertedStudents,
    totalCommission: Number(totalCommission._sum.commissionAmount ?? 0),
    pendingCommission: Number(pendingCommission._sum.commissionAmount ?? 0),
    paidCommission: Number(paidCommission._sum.commissionAmount ?? 0),
    agencyName: agency?.name ?? "My Agency",
  };

  return <AgencyDashboard stats={stats} agency={agency} />;
}
