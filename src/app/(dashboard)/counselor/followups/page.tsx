import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Calendar, ChevronRight } from "lucide-react";

export const metadata: Metadata = { title: "Follow-ups" };

export default async function FollowupsPage() {
  const user = await requireRole(["SUGG_COUNSELOR", "SUPER_ADMIN"]);

  // Only follow-ups that actually have a scheduled date/time are shown here.
  const followups = await prisma.leadFollowup.findMany({
    where: {
      dueAt: { not: undefined },
      ...(user.role === "SUGG_COUNSELOR" ? { user: { supabaseId: user.supabaseId } } : {}),
    },
    orderBy: { dueAt: "asc" },
    include: {
      lead: { include: { student: { select: { name: true } } } },
    },
    take: 50,
  });

  const now = new Date();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Follow-ups</h1>
        <p className="text-muted-foreground text-sm mt-1">{followups.length} scheduled</p>
      </div>

      <div className="space-y-3">
        {followups.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-lg">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No follow-ups scheduled
          </div>
        ) : (
          followups.map((f) => {
            const isOverdue = new Date(f.dueAt) < now && f.status !== "COMPLETED";
            const isDone = f.status === "COMPLETED";
            return (
              <Link
                key={f.id}
                href={`/counselor/leads/${f.leadId}`}
                className={`rounded-lg border p-4 flex items-start gap-4 transition-colors hover:border-primary/50 hover:shadow-sm ${isOverdue ? "border-red-200 bg-red-50/50" : "bg-card"}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isOverdue ? "bg-red-100" : "bg-blue-50"}`}>
                  <Calendar className={`w-4 h-4 ${isOverdue ? "text-red-600" : "text-blue-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{f.lead.student.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDone ? "bg-green-100 text-green-700" : isOverdue ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                      {isDone ? "Done" : isOverdue ? "Overdue" : "Pending"}
                    </span>
                  </div>
                  <p className="font-medium text-sm">{f.title}</p>
                  {f.description && <p className="text-sm text-muted-foreground mt-0.5">{f.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(f.dueAt).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-primary mt-1.5 inline-flex items-center gap-0.5">Open lead to edit / update <ChevronRight className="w-3 h-3" /></p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
