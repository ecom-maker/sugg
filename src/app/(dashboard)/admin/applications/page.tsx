import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Applications" };

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ENROLLED: "bg-purple-100 text-purple-700",
};

export default async function AdminApplicationsPage() {
  await requireRole(["SUPER_ADMIN"]);

  const applications = await prisma.application.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { name: true, email: true } },
      college: { select: { name: true } },
      course: { select: { name: true } },
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Applications</h1>
        <p className="text-muted-foreground text-sm mt-1">{applications.length} total applications</p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Student</th>
              <th className="text-left px-4 py-3 font-medium">College</th>
              <th className="text-left px-4 py-3 font-medium">Course</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {applications.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No applications yet</td></tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{app.student.name}</div>
                    <div className="text-xs text-muted-foreground">{app.student.email ?? ""}</div>
                  </td>
                  <td className="px-4 py-3">{app.college.name}</td>
                  <td className="px-4 py-3">{app.course.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-700"}`}>
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
  );
}
