"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createEducationHistory } from "@/actions/student-profile";

export function StudentEducationTab({ studentId }: { studentId: string }) {
  const [education, setEducation] = useState<Array<{
    id: string; educationLevel: string; institutionName: string;
    boardOrUniversity: string | null; streamOrMajor: string | null;
    yearOfCompletion: number | null; gradingSystem: string; scoreValue: number;
    migratedFromLegacy: boolean;
  }>>([]);
  const [testScores, setTestScores] = useState<Array<{
    id: string; testType: string; overallScore: number; validUntil: string | null;
    sectionScores: Record<string, number> | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    fetch(`/api/students/${studentId}/education`)
      .then((r) => r.json())
      .then((d) => {
        setEducation(d.education ?? []);
        setTestScores(d.testScores ?? []);
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, [studentId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await createEducationHistory(studentId, fd);
    setShowForm(false);
    load();
  };

  if (loading) return <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Education History</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" />Add Entry
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
              <Select name="educationLevel" defaultValue="BACHELOR">
                <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                <SelectContent>
                  {["TENTH", "TWELFTH", "DIPLOMA", "BACHELOR", "MASTER", "DOCTORATE", "CERTIFICATION"].map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input name="institutionName" placeholder="Institution" required />
              <Input name="boardOrUniversity" placeholder="Board/University" />
              <Input name="streamOrMajor" placeholder="Stream/Major" />
              <Input name="yearOfCompletion" type="number" placeholder="Year" />
              <Select name="gradingSystem" defaultValue="PERCENTAGE">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["PERCENTAGE", "CGPA_10", "CGPA_4", "GPA", "GRADE"].map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input name="scoreValue" placeholder="Score" required />
              <Input name="scoreMax" placeholder="Max Score (optional)" />
              <Button type="submit" className="col-span-2">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {education.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No education records.</p>
      ) : (
        education.map((e) => (
          <Card key={e.id}>
            <CardContent className="py-3 flex items-start gap-3">
              <GraduationCap className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">{e.educationLevel} — {e.institutionName}</p>
                <p className="text-xs text-muted-foreground">
                  {e.boardOrUniversity} {e.streamOrMajor && `· ${e.streamOrMajor}`}
                  {e.yearOfCompletion && ` · ${e.yearOfCompletion}`}
                </p>
                <p className="text-xs">Score: {e.scoreValue} ({e.gradingSystem})</p>
                {e.migratedFromLegacy && <span className="text-xs text-amber-600">Migrated from legacy fields</span>}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {testScores.length > 0 && (
        <>
          <h3 className="font-medium mt-6">Test Scores</h3>
          {testScores.map((t) => (
            <Card key={t.id}>
              <CardContent className="py-3 text-sm">
                <p className="font-medium">{t.testType}: {t.overallScore}</p>
                {t.sectionScores && (
                  <p className="text-xs text-muted-foreground">{JSON.stringify(t.sectionScores)}</p>
                )}
                {t.validUntil && <p className="text-xs">Valid until: {new Date(t.validUntil).toLocaleDateString()}</p>}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
