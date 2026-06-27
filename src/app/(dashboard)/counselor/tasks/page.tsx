import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClipboardList } from "lucide-react";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const user = await requireRole(["SUGG_COUNSELOR", "SUPER_ADMIN"]);

  const tasks = await prisma.task.findMany({
    where: { assignedTo: { supabaseId: user.supabaseId } },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    take: 50,
  });

  const PRIORITY_COLORS: Record<string, string> = {
    URGENT: "bg-red-100 text-red-700",
    HIGH: "bg-orange-100 text-orange-700",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    LOW: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tasks</h1>
        <p className="text-muted-foreground text-sm mt-1">{tasks.filter((t) => !t.isCompleted).length} pending</p>
      </div>

      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-lg">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No tasks assigned
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className={`flex items-start gap-3 rounded-lg border p-4 ${task.isCompleted ? "opacity-60" : ""}`}>
              <div className={`w-4 h-4 rounded mt-0.5 border-2 shrink-0 ${task.isCompleted ? "bg-green-500 border-green-500" : "border-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-medium ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority] ?? ""}`}>{task.priority}</span>
                </div>
                {task.description && <p className="text-sm text-muted-foreground mt-0.5">{task.description}</p>}
                {task.dueDate && <p className="text-xs text-muted-foreground mt-1">Due: {new Date(task.dueDate).toLocaleDateString("en-IN")}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
