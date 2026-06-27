import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CollegeDashboard } from "@/components/dashboard/college/college-dashboard";

export const metadata: Metadata = { title: "College Dashboard" };

export default async function CollegePage() {
  const user = await requireRole(["COLLEGE_ADMIN", "SUPER_ADMIN"]);

  const college = await prisma.college.findFirst({
    where: user.role === "COLLEGE_ADMIN" ? { adminId: user.id } : undefined,
    include: {
      _count: {
        select: {
          courses: true,
          applications: true,
        },
      },
    },
  });

  if (!college && user.role === "COLLEGE_ADMIN") {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">
          Your college profile is not yet set up. Please contact the admin.
        </p>
      </div>
    );
  }

  const [
    totalApplications,
    submittedApplications,
    acceptedApplications,
    enrolledApplications,
    totalCommission,
  ] = await Promise.all([
    prisma.application.count({
      where: college ? { collegeId: college.id } : {},
    }),
    prisma.application.count({
      where: { ...(college ? { collegeId: college.id } : {}), status: "SUBMITTED" },
    }),
    prisma.application.count({
      where: { ...(college ? { collegeId: college.id } : {}), status: "ACCEPTED" },
    }),
    prisma.application.count({
      where: { ...(college ? { collegeId: college.id } : {}), status: "ENROLLED" },
    }),
    prisma.commissionTransaction.aggregate({
      _sum: { commissionAmount: true },
      where: {
        ...(college ? { collegeId: college.id } : {}),
        status: "PAID",
      },
    }),
  ]);

  const stats = {
    totalApplications,
    submittedApplications,
    acceptedApplications,
    enrolledApplications,
    totalCommission: Number(totalCommission._sum.commissionAmount ?? 0),
    totalCourses: college?._count.courses ?? 0,
    collegeName: college?.name ?? "All Colleges",
    collegeStatus: college?.status ?? "APPROVED",
  };

  return <CollegeDashboard stats={stats} college={college} />;
}
