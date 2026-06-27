import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";

export const metadata: Metadata = { title: "Calls" };

export default async function CallsPage() {
  const user = await requireRole(["SUGG_COUNSELOR", "SUPER_ADMIN"]);

  const calls = await prisma.callLog.findMany({
    where: { counselor: { supabaseId: user.supabaseId } },
    orderBy: { calledAt: "desc" },
    take: 50,
    include: { student: { select: { fullName: true, phone: true } } },
  });

  const CallIcon = (type: string) => {
    if (type === "INBOUND") return <PhoneIncoming className="w-4 h-4 text-green-600" />;
    if (type === "MISSED") return <PhoneMissed className="w-4 h-4 text-red-600" />;
    return <PhoneOutgoing className="w-4 h-4 text-blue-600" />;
  };

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
          calls.map((call) => (
            <div key={call.id} className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                {CallIcon(call.callType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{call.student?.fullName ?? call.phoneNumber}</p>
                <p className="text-xs text-muted-foreground">{call.callType} · {call.durationSeconds ? `${Math.round(call.durationSeconds / 60)}m` : "No answer"}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {new Date(call.calledAt).toLocaleDateString("en-IN")}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
