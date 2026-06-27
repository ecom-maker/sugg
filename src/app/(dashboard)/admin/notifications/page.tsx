import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Bell } from "lucide-react";

export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  await requireRole(["SUPER_ADMIN"]);

  const notifications = await prisma.notification.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { fullName: true } } },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">{notifications.length} recent notifications</p>
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-lg">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No notifications yet
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 rounded-lg border p-4 ${n.isRead ? "bg-card" : "bg-blue-50/50 border-blue-100"}`}>
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.isRead ? "bg-muted" : "bg-blue-500"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">{n.title}</p>
                  <span className="text-xs text-muted-foreground shrink-0">{new Date(n.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">→ {n.user.fullName}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
