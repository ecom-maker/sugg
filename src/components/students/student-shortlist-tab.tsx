"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function StudentShortlistTab({ studentId }: { studentId: string }) {
  const [shortlists, setShortlists] = useState<Array<{
    id: string; priority: number; status: string; notes: string | null;
    course: { id: string; name: string; eligibility: string | null; annualFee: number | null; commissionType: string | null; commissionValue: number | null };
    college: { name: string };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [courseId, setCourseId] = useState("");

  const load = () => {
    fetch(`/api/students/${studentId}/shortlist`)
      .then((r) => r.json())
      .then((d) => { setShortlists(d.shortlists ?? []); setLoading(false); });
  };

  useEffect(() => { load(); }, [studentId]);

  const add = async () => {
    if (!courseId) return;
    await fetch(`/api/students/${studentId}/shortlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    });
    setCourseId("");
    load();
  };

  const remove = async (entryId: string) => {
    await fetch(`/api/students/${studentId}/shortlist?entryId=${entryId}`, { method: "DELETE" });
    load();
  };

  const apply = async (entryId: string) => {
    const res = await fetch(`/api/students/${studentId}/shortlist/${entryId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    load();
  };

  if (loading) return <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 flex gap-2">
          <Input placeholder="Course ID" value={courseId} onChange={(e) => setCourseId(e.target.value)} className="flex-1" />
          <Button onClick={add}><Plus className="w-4 h-4 mr-1" />Add</Button>
        </CardContent>
      </Card>

      {shortlists.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No shortlisted courses. Add from the course catalog.</p>
      ) : (
        shortlists.map((s) => (
          <Card key={s.id}>
            <CardContent className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{s.priority}</Badge>
                    <span className="font-medium text-sm">{s.course.name}</span>
                    <Badge>{s.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{s.college.name}</p>
                  {s.course.eligibility && (
                    <p className="text-xs mt-2 p-2 bg-muted/50 rounded">Eligibility: {s.course.eligibility}</p>
                  )}
                  {s.course.commissionType && (
                    <p className="text-xs text-green-700 mt-1">
                      Commission: {s.course.commissionType} {s.course.commissionValue}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  {s.status === "SHORTLISTED" && (
                    <Button size="sm" onClick={() => apply(s.id)}>Apply</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
