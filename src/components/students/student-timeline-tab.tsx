"use client";

import { useState, useEffect } from "react";
import { Loader2, MessageSquare, StickyNote, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageSquare,
  note: StickyNote,
  followup: Calendar,
  application_status: FileText,
};

export function StudentTimelineTab({ studentId }: { studentId: string }) {
  const [items, setItems] = useState<Array<{
    id: string; type: string; title: string; description?: string; actor?: string; createdAt: string;
  }>>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = (c?: string | null) => {
    const url = `/api/students/${studentId}/timeline${c ? `?cursor=${c}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (c) {
          setItems((prev) => [...prev, ...(d.items ?? [])]);
        } else {
          setItems(d.items ?? []);
        }
        setCursor(d.nextCursor);
        setLoading(false);
        setLoadingMore(false);
      });
  };

  useEffect(() => { load(); }, [studentId]);

  if (loading) return <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No timeline events yet.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = ICONS[item.type] ?? StickyNote;
        return (
          <Card key={item.id}>
            <CardContent className="py-3 flex gap-3">
              <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                {item.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>}
                {item.actor && <p className="text-xs text-muted-foreground">{item.actor}</p>}
              </div>
            </CardContent>
          </Card>
        );
      })}
      {cursor && (
        <Button variant="outline" className="w-full" disabled={loadingMore} onClick={() => { setLoadingMore(true); load(cursor); }}>
          {loadingMore ? "Loading..." : "Load more"}
        </Button>
      )}
    </div>
  );
}
