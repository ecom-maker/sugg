"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN");
}

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/notifications");
      const d = await r.json();
      setItems(d.notifications ?? []);
      setUnread(d.unreadCount ?? 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000); // refresh unread count each minute
    return () => clearInterval(t);
  }, [load]);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAllRead" }),
    });
    setItems((s) => s.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const markRead = async (id: string) => {
    setItems((s) => s.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markRead", notificationId: id }),
    });
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && load()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
            >
              {unread > 99 ? "99+" : unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              <CheckCheck className="w-3 h-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-auto">
          {loading && items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 mx-auto animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              You&apos;re all caught up.
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={`w-full text-left px-3 py-2.5 border-b last:border-0 hover:bg-muted/50 transition-colors ${
                  n.isRead ? "" : "bg-primary/5"
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />}
                  <div className={`min-w-0 ${n.isRead ? "pl-4" : ""}`}>
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
