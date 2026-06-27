import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClipboardList } from "lucide-react";

export const metadata: Metadata = { title: "Audit Logs" };

export default async function AdminAuditLogsPage() {
  await requireRole(["SUPER_ADMIN"]);

  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { fullName: true, role: true } } },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">All system activity (last 100 entries)</p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Action</th>
              <th className="text-left px-4 py-3 font-medium">Entity</th>
              <th className="text-left px-4 py-3 font-medium">User</th>
              <th className="text-left px-4 py-3 font-medium">IP</th>
              <th className="text-left px-4 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No audit logs yet
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-mono bg-muted">{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{log.entityType} <span className="font-mono text-xs">{log.entityId.slice(0, 8)}…</span></td>
                  <td className="px-4 py-3">
                    <div>{log.user?.fullName ?? "System"}</div>
                    <div className="text-xs text-muted-foreground">{log.user?.role?.replace(/_/g, " ")}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{log.ipAddress ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(log.createdAt).toLocaleString("en-IN")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
