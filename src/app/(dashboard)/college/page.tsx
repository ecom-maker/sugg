import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FileText, CheckCircle, BookOpen, Users, DollarSign, XCircle, Clock } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "College Dashboard" };

export default async function CollegePage() {
  const user = await requireRole(["COLLEGE_ADMIN", "SUPER_ADMIN"]);

  const college = await prisma.college.findFirst({
    where: user.role === "COLLEGE_ADMIN" ? { adminId: user.id } : undefined,
    include: { _count: { select: { courses: true, applications: true } } },
  });

  if (!college && user.role === "COLLEGE_ADMIN") {
    return (
      <div className="p-6 text-center py-20">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mb-4">
          <BookOpen className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="font-medium text-lg">College profile not set up</p>
        <p className="text-muted-foreground text-sm mt-2">Please contact the Sugg admin team.</p>
      </div>
    );
  }

  if (college?.status === "PENDING") {
    return (
      <div className="p-6 text-center py-20">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-yellow-50 mb-4">
          <Clock className="w-6 h-6 text-yellow-600" />
        </div>
        <p className="font-medium text-lg">Application Under Review</p>
        <p className="text-muted-foreground text-sm mt-2">Your institution is pending admin approval. You will be notified by email.</p>
      </div>
    );
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalApplications,
    pendingApplications,
    underReviewApplications,
    acceptedApplications,
    rejectedApplications,
    enrolledApplications,
    thisMonthApplications,
    totalCommission,
    recentApplications,
  ] = await Promise.all([
    prisma.application.count({ where: college ? { collegeId: college.id } : {} }),
    prisma.application.count({ where: { ...(college ? { collegeId: college.id } : {}), status: "SUBMITTED" } }),
    prisma.application.count({ where: { ...(college ? { collegeId: college.id } : {}), status: "UNDER_REVIEW" } }),
    prisma.application.count({ where: { ...(college ? { collegeId: college.id } : {}), status: "ACCEPTED" } }),
    prisma.application.count({ where: { ...(college ? { collegeId: college.id } : {}), status: "REJECTED" } }),
    prisma.application.count({ where: { ...(college ? { collegeId: college.id } : {}), status: "ENROLLED" } }),
    prisma.application.count({ where: { ...(college ? { collegeId: college.id } : {}), createdAt: { gte: startOfMonth } } }),
    prisma.commissionTransaction.aggregate({
      _sum: { commissionAmount: true },
      where: { ...(college ? { collegeId: college.id } : {}), status: "PAID" },
    }),
    prisma.application.findMany({
      where: college ? { collegeId: college.id } : {},
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        student: { select: { name: true, email: true } },
        course: { select: { name: true } },
      },
    }),
  ]);

  const STATUS_COLORS: Record<string, string> = {
    SUBMITTED: "bg-blue-100 text-blue-700",
    UNDER_REVIEW: "bg-yellow-100 text-yellow-700",
    ACCEPTED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    ENROLLED: "bg-purple-100 text-purple-700",
  };

  const statCards = [
    { label: "Total Applications", value: totalApplications, icon: FileText, color: "text-blue-600", bg: "bg-blue-50", href: "/college/applications" },
    { label: "Pending Review", value: pendingApplications + underReviewApplications, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50", href: "/college/applications?status=SUBMITTED" },
    { label: "Accepted", value: acceptedApplications, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", href: "/college/applications?status=ACCEPTED" },
    { label: "Rejected", value: rejectedApplications, icon: XCircle, color: "text-red-600", bg: "bg-red-50", href: "/college/applications?status=REJECTED" },
    { label: "Enrolled (Admissions)", value: enrolledApplications, icon: Users, color: "text-purple-600", bg: "bg-purple-50", href: "/college/applications?status=ENROLLED" },
    { label: "Courses Listed", value: college?._count.courses ?? 0, icon: BookOpen, color: "text-cyan-600", bg: "bg-cyan-50", href: "/college/courses" },
    { label: "This Month", value: thisMonthApplications, icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50", href: "/college/applications" },
    { label: "Commission Earned", value: `₹${Number(totalCommission._sum.commissionAmount ?? 0).toLocaleString("en-IN")}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", href: "/college/commissions" },
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{college?.name ?? "College"} Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back — here&apos;s your admission overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Recent Applications */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent Applications</h2>
          <Link href="/college/applications" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Student</th>
                <th className="text-left px-4 py-3 font-medium">Course</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentApplications.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No applications yet</td></tr>
              ) : (
                recentApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{app.student.name}</p>
                      <p className="text-xs text-muted-foreground">{app.student.email ?? ""}</p>
                    </td>
                    <td className="px-4 py-3">{app.course.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[app.status] ?? ""}`}>
                        {app.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(app.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
