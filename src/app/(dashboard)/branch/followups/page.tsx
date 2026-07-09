import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Calendar } from "lucide-react";

export const metadata: Metadata = { title: "Branch Follow-ups" };

export default async function BranchFollowupsPage() {
  const user = await requireRole(["BRANCH_MANAGER", "SUPER_ADMIN"]);

  const branch = await prisma.agencyBranch.findFirst({
    where: { manager: { supabaseId: user.supabaseId } },
  });

  const followups = branch
    ? await prisma.leadFollowup.findMany({
        where: { lead: { branchId: branch.id } },
        orderBy: { dueAt: "asc" },
        take: 50,
        include: {
          lead: { include: { student: { select: { name: true } }, assignedTo: { select: { fullName: true } } } },
        },
      })
    : [];

  const now = new Date();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Branch Follow-ups</h1>
        <p className="text-muted-foreground text-sm mt-1">{followups.filter(f => f.status !== "COMPLETED").length} pending</p>
      </div>

      <div className="space-y-2">
        {followups.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-lg">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />No follow-ups scheduled
          </div>
        ) : (
          followups.map((f) => {
            const isDone = f.status === "COMPLETED";
            const isOverdue = !isDone && new Date(f.dueAt) < now;
            return (
              <div key={f.id} className={`flex items-start gap-4 rounded-lg border p-4 ${isOverdue ? "border-red-200 bg-red-50/50" : "bg-card"}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isOverdue ? "bg-red-100" : "bg-blue-50"}`}>
                  <Calendar className={`w-4 h-4 ${isOverdue ? "text-red-600" : "text-blue-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 justify-between">
                    <p className="font-medium">{f.lead.student.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDone ? "bg-green-100 text-green-700" : isOverdue ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                      {isDone ? "Done" : isOverdue ? "Overdue" : "Pending"}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{f.title}</p>
                  {f.description && <p className="text-sm text-muted-foreground">{f.description}</p>}
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    <span>Counselor: {f.lead.assignedTo?.fullName ?? "Unassigned"}</span>
                    <span>{new Date(f.dueAt).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
