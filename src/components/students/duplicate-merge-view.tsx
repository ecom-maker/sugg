"use client";

import { useState, useEffect } from "react";
import { Loader2, GitMerge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { mergeStudents } from "@/actions/student-profile";

export function DuplicateMergeView() {
  const [duplicates, setDuplicates] = useState<Array<{
    id: string; reason: string;
    studentA: { id: string; name: string; mobile: string; email: string | null; _count: { applications: number; documents: number } };
    studentB: { id: string; name: string; mobile: string; email: string | null; _count: { applications: number; documents: number } };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/students/duplicates")
      .then((r) => r.json())
      .then((d) => { setDuplicates(d.duplicates ?? []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const merge = async (survivingId: string, duplicateId: string, flagId: string) => {
    setMerging(flagId);
    await mergeStudents(survivingId, duplicateId);
    setMerging(null);
    load();
  };

  if (loading) return <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitMerge className="w-6 h-6" />Duplicate Students
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Review and merge flagged duplicate records</p>
      </div>

      {duplicates.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No pending duplicates.</p>
      ) : (
        duplicates.map((d) => (
          <Card key={d.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="warning">{d.reason.replace("_", " ")}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[d.studentA, d.studentB].map((s) => (
                  <div key={s.id} className="border rounded-lg p-4 space-y-2">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.mobile}</p>
                    <p className="text-sm">{s.email ?? "No email"}</p>
                    <p className="text-xs">{s._count.applications} applications · {s._count.documents} documents</p>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/students/${s.id}`}>View Profile</Link>
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  disabled={merging === d.id}
                  onClick={() => merge(d.studentA.id, d.studentB.id, d.id)}
                >
                  Keep {d.studentA.name} (merge B)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={merging === d.id}
                  onClick={() => merge(d.studentB.id, d.studentA.id, d.id)}
                >
                  Keep {d.studentB.name} (merge A)
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
