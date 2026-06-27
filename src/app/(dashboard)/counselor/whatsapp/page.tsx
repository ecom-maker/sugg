import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MessageSquare } from "lucide-react";

export const metadata: Metadata = { title: "WhatsApp" };

export default async function WhatsAppPage() {
  await requireRole(["SUGG_COUNSELOR", "SUPER_ADMIN"]);

  const messages = await prisma.whatsappMessage.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: { student: { select: { name: true, mobile: true } } },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">WhatsApp</h1>
        <p className="text-muted-foreground text-sm mt-1">Recent conversations</p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {messages.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No WhatsApp messages yet</p>
            <p className="text-xs mt-1">Messages will appear here when leads contact via WhatsApp</p>
          </div>
        ) : (
          <div className="divide-y">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-3 p-4 hover:bg-muted/30">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{msg.student.name}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${msg.direction === "INBOUND" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                        {msg.direction}
                      </span>
                      <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{msg.content ?? `[${msg.type}]`}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
