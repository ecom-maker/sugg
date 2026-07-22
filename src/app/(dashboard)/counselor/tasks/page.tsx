import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClipboardList } from "lucide-react";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const user = await requireRole(["SUGG_COUNSELOR", "AGENCY_COUNSELOR", "SUPER_ADMIN"]);

  const tasks = await prisma.task.findMany({
    where: { assignee: { supabaseId: user.supabaseId } },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 50,
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
        <h1 className="text-2xl font-bold">Tasks</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {tasks.filter((t) => t.status !== "COMPLETED").length} pending
        </p>
      </div>

      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-lg">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No tasks assigned
          </div>
        ) : (
          tasks.map((task) => {
            const isDone = task.status === "COMPLETED";
            return (
              <div key={task.id} className={`flex items-start gap-3 rounded-lg border p-4 ${isDone ? "opacity-60" : ""}`}>
                <div className={`w-4 h-4 rounded mt-0.5 border-2 shrink-0 ${isDone ? "bg-green-500 border-green-500" : "border-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] ?? ""}`}>{task.status.replace(/_/g, " ")}</span>
                  </div>
                  {task.description && <p className="text-sm text-muted-foreground mt-0.5">{task.description}</p>}
                  {task.dueAt && <p className="text-xs text-muted-foreground mt-1">Due: {new Date(task.dueAt).toLocaleDateString("en-IN")}</p>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
