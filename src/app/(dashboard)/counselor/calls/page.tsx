import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";

export const metadata: Metadata = { title: "Calls" };

export default async function CallsPage() {
  const user = await requireRole(["SUGG_COUNSELOR", "SUPER_ADMIN"]);

  const calls = await prisma.call.findMany({
    where: { user: { supabaseId: user.supabaseId } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Call Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">{calls.length} calls logged</p>
      </div>

      <div className="space-y-2">
        {calls.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-lg">
            <Phone className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No calls logged yet
          </div>
        ) : (
          calls.map((call) => {
            const Icon = call.type === "INBOUND" ? PhoneIncoming
              : call.status === "MISSED" ? PhoneMissed
              : PhoneOutgoing;
            return (
              <div key={call.id} className="flex items-center gap-3 rounded-lg border bg-card p-4">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon className={`w-4 h-4 ${call.type === "INBOUND" ? "text-green-600" : call.status === "MISSED" ? "text-red-600" : "text-blue-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{call.phoneNumber}</p>
                  <p className="text-xs text-muted-foreground">{call.type} · {call.status} {call.duration ? `· ${Math.round(call.duration / 60)}m` : ""}</p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {new Date(call.createdAt).toLocaleDateString("en-IN")}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
