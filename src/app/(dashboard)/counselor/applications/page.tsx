import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FileText } from "lucide-react";

export const metadata: Metadata = { title: "Applications" };

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ENROLLED: "bg-purple-100 text-purple-700",
};

export default async function CounselorApplicationsPage() {
  const user = await requireRole(["SUGG_COUNSELOR", "SUPER_ADMIN"]);

  const applications = await prisma.application.findMany({
    where: user.role === "SUGG_COUNSELOR" ? { submittedById: user.id } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      student: { select: { name: true } },
      college: { select: { name: true } },
      course: { select: { name: true } },
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Applications</h1>
        <p className="text-muted-foreground text-sm mt-1">{applications.length} applications</p>
      </div>

      <div className="space-y-2">
        {applications.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-lg">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No applications yet
          </div>
        ) : (
          applications.map((app) => (
            <div key={app.id} className="rounded-lg border bg-card p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{app.student.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[app.status] ?? ""}`}>{app.status.replace(/_/g, " ")}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{app.college.name} · {app.course.name}</p>
              </div>
              <span className="text-sm text-muted-foreground shrink-0">{new Date(app.createdAt).toLocaleDateString("en-IN")}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
