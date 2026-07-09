import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Building2, CheckCircle, XCircle, Mail, Phone, Globe, MapPin, User, BookOpen, FileText } from "lucide-react";
import Link from "next/link";
import { CollegeApprovalActions } from "@/components/college/approval-actions";

export const metadata: Metadata = { title: "College Details" };

export default async function AdminCollegeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["SUPER_ADMIN"]);
  const { id } = await params;

  const college = await prisma.college.findUnique({
    where: { id },
    include: {
      admin: { select: { fullName: true, email: true, isActive: true } },
      _count: { select: { courses: true, applications: true, commissions: true } },
    },
  });

  if (!college) notFound();

  const recentApps = await prisma.application.findMany({
    where: { collegeId: id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { student: { select: { name: true } }, course: { select: { name: true } } },
  });

  const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    SUSPENDED: "bg-orange-100 text-orange-700",
    ARCHIVED: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{college.name}</h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${STATUS_COLORS[college.status] ?? ""}`}>
                {college.status}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">{college.officialEmail}</p>
          </div>
        </div>
        <Link href="/admin/colleges" className="text-sm text-muted-foreground hover:underline">← Back</Link>
      </div>

      {/* Verification & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm">Verification Status</h3>
          <div className="flex items-center gap-2 text-sm">
            {college.emailVerified
              ? <CheckCircle className="w-4 h-4 text-green-500" />
              : <XCircle className="w-4 h-4 text-red-400" />}
            <span>Email: {college.emailVerified ? "Verified" : "Not Verified"}</span>
          </div>
          {college.approvedAt && (
            <p className="text-xs text-muted-foreground">Approved: {new Date(college.approvedAt).toLocaleDateString("en-IN")}</p>
          )}
          {college.rejectionReason && (
            <p className="text-xs text-red-600">Rejection reason: {college.rejectionReason}</p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3">Actions</h3>
          <CollegeApprovalActions
            collegeId={college.id}
            collegeName={college.name}
            currentStatus={college.status}
          />
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">College Information</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            {college.contactPersonName && (
              <div className="flex items-center gap-2"><User className="w-4 h-4" />{college.contactPersonName} {college.contactPersonDesig ? `(${college.contactPersonDesig})` : ""}</div>
            )}
            {college.contactPhone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" />{college.contactPhone}</div>}
            <div className="flex items-center gap-2"><Mail className="w-4 h-4" />{college.officialEmail}</div>
            {college.website && <div className="flex items-center gap-2"><Globe className="w-4 h-4" /><a href={college.website} target="_blank" className="text-primary hover:underline">{college.website}</a></div>}
            {(college.city ?? college.country) && (
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{[college.address, college.city, college.state, college.country].filter(Boolean).join(", ")}</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">Admin User</h3>
          {college.admin ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium">{college.admin.fullName}</p>
              <p className="text-muted-foreground">{college.admin.email}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${college.admin.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {college.admin.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No admin user linked</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Courses", value: college._count.courses, icon: BookOpen },
          { label: "Applications", value: college._count.applications, icon: FileText },
          { label: "Commissions", value: college._count.commissions, icon: FileText },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-lg border bg-card p-4 text-center">
              <Icon className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Applications */}
      {recentApps.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Recent Applications</h2>
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
                {recentApps.map((app) => (
                  <tr key={app.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">{app.student.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{app.course.name}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{app.status}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(app.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
