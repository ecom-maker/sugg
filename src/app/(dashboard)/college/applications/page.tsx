import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FileText } from "lucide-react";

export const metadata: Metadata = { title: "Applications" };

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ENROLLED: "bg-purple-100 text-purple-700",
};

export default async function CollegeApplicationsPage() {
  const user = await requireRole(["COLLEGE_ADMIN"]);

  const college = await prisma.college.findFirst({
    where: { users: { some: { supabaseId: user.supabaseId } } },
  });

  const applications = college
    ? await prisma.application.findMany({
        where: { collegeId: college.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          student: { select: { fullName: true, email: true } },
          course: { select: { name: true } },
        },
      })
    : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Applications</h1>
        <p className="text-muted-foreground text-sm mt-1">{applications.length} received</p>
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
            {applications.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">
                <FileText className="w-6 h-6 mx-auto mb-1 opacity-30" />
                No applications yet
              </td></tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{app.student.fullName}</div>
                    <div className="text-xs text-muted-foreground">{app.student.email}</div>
                  </td>
                  <td className="px-4 py-3">{app.course.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[app.status] ?? ""}`}>{app.status.replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(app.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
