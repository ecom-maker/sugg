import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClipboardList } from "lucide-react";

export const metadata: Metadata = { title: "Branch Tasks" };

export default async function BranchTasksPage() {
  const user = await requireRole(["BRANCH_MANAGER", "SUPER_ADMIN"]);

  const tasks = await prisma.task.findMany({
    where: { assignee: { managedBranch: { manager: { supabaseId: user.supabaseId } } } },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 50,
    include: { assignee: { select: { fullName: true } } },
  });

  const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Branch Tasks</h1>
        <p className="text-muted-foreground text-sm mt-1">{tasks.filter(t => t.status !== "COMPLETED").length} pending</p>
      </div>

      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-lg">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />No tasks
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className={`flex items-start gap-3 rounded-lg border p-4 ${task.status === "COMPLETED" ? "opacity-60" : "bg-card"}`}>
              <div className={`w-4 h-4 rounded mt-0.5 border-2 shrink-0 ${task.status === "COMPLETED" ? "bg-green-500 border-green-500" : "border-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-medium ${task.status === "COMPLETED" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] ?? ""}`}>{task.status.replace(/_/g, " ")}</span>
                </div>
                {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                  {task.assignee && <span>Assigned to: {task.assignee.fullName}</span>}
                  {task.dueAt && <span>Due: {new Date(task.dueAt).toLocaleDateString("en-IN")}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
