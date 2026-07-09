"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  User, Phone, Mail, MapPin, MessageSquare, PhoneCall, StickyNote, Calendar,
  GraduationCap, FileText, Clock, ListChecks, Shield, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CONSENT_LABELS } from "@/lib/consent";
import { StudentDocumentsTab } from "./student-documents-tab";
import { StudentEducationTab } from "./student-education-tab";
import { StudentShortlistTab } from "./student-shortlist-tab";
import { StudentConsentTab } from "./student-consent-tab";
import { StudentTimelineTab } from "./student-timeline-tab";

interface ProfileData {
  header: {
    id: string;
    name: string;
    mobile: string;
    mobileDisplay: string;
    email: string | null;
    source: string;
    agency: { name: string } | null;
    branch: { branchName: string } | null;
    counselor: { fullName: string } | null;
    leadStatus: string | null;
    leadScore: number | null;
    geoBreadcrumb: string[];
    consents: Record<string, boolean>;
    documentCount: number;
    nextFollowup: { title: string; dueAt: string } | null;
  };
  overview: {
    educationLevel: string | null;
    qualification: string | null;
    interestedCourse: string | null;
    preferredCollege: string | null;
    preferredCountry: string | null;
    budget: number | null;
    shortlists: Array<{ id: string; priority: number; status: string; course: { name: string }; college: { name: string } }>;
    applications: Array<{ id: string; status: string; college: { name: string }; course: { name: string } }>;
    education: Array<{ educationLevel: string; institutionName: string; scoreValue: number }>;
    testScores: Array<{ testType: string; overallScore: number }>;
  };
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-yellow-100 text-yellow-800",
  QUALIFIED: "bg-purple-100 text-purple-800",
  COLLEGE_SHORTLISTED: "bg-indigo-100 text-indigo-800",
  APPLICATION_SUBMITTED: "bg-orange-100 text-orange-800",
  ADMISSION_CONFIRMED: "bg-green-100 text-green-800",
  LOST: "bg-red-100 text-red-800",
};

export function Student360View({ studentId, isSuperAdmin = false }: { studentId: string; isSuperAdmin?: boolean }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/students/${studentId}/profile`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.header) {
    return <p className="text-center py-20 text-muted-foreground">Student not found or access denied.</p>;
  }

  const { header, overview } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{header.name}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{header.mobileDisplay}</span>
                  {header.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{header.email}</span>}
                  {header.geoBreadcrumb.length > 0 && (
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{header.geoBreadcrumb.join(" → ")}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">{header.source.replace("_", " ")}</Badge>
                  {header.leadStatus && (
                    <Badge className={STATUS_COLORS[header.leadStatus] ?? ""}>{header.leadStatus.replace(/_/g, " ")}</Badge>
                  )}
                  {header.leadScore != null && <Badge variant="secondary">Score: {header.leadScore}</Badge>}
                  {header.agency && <Badge variant="outline">{header.agency.name}</Badge>}
                  {header.branch && <Badge variant="outline">{header.branch.branchName}</Badge>}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Object.entries(header.consents).map(([key, ok]) => (
                    <span key={key} className={`text-xs px-2 py-0.5 rounded-full ${ok ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                  ))}
                </div>
                {header.counselor && (
                  <p className="text-xs text-muted-foreground mt-1">Counselor: {header.counselor.fullName}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/counselor/whatsapp?student=${studentId}`}><MessageSquare className="w-4 h-4 mr-1" />WhatsApp</Link>
              </Button>
              <Button variant="outline" size="sm"><PhoneCall className="w-4 h-4 mr-1" />Log Call</Button>
              <Button variant="outline" size="sm"><StickyNote className="w-4 h-4 mr-1" />Add Note</Button>
              <Button variant="outline" size="sm"><Calendar className="w-4 h-4 mr-1" />Follow-up</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="documents">Documents ({header.documentCount})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="shortlist">Shortlist</TabsTrigger>
          <TabsTrigger value="consent">Consent</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Intake Hints</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Education:</span> {overview.educationLevel ?? "—"} / {overview.qualification ?? "—"}</p>
                <p><span className="text-muted-foreground">Interested:</span> {overview.interestedCourse ?? "—"}</p>
                <p><span className="text-muted-foreground">Preferred College:</span> {overview.preferredCollege ?? "—"}</p>
                <p><span className="text-muted-foreground">Country:</span> {overview.preferredCountry ?? "—"}</p>
                {overview.budget && <p><span className="text-muted-foreground">Budget:</span> ₹{Number(overview.budget).toLocaleString()}</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Next Follow-up</CardTitle></CardHeader>
              <CardContent className="text-sm">
                {header.nextFollowup ? (
                  <p>{header.nextFollowup.title} — due {new Date(header.nextFollowup.dueAt).toLocaleDateString()}</p>
                ) : (
                  <p className="text-muted-foreground">No pending follow-ups</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ListChecks className="w-4 h-4" />Active Shortlist</CardTitle></CardHeader>
            <CardContent>
              {overview.shortlists.length === 0 ? (
                <p className="text-sm text-muted-foreground">No courses shortlisted yet.</p>
              ) : (
                <ul className="space-y-2">
                  {overview.shortlists.filter((s) => s.status === "SHORTLISTED").map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">#{s.priority}</Badge>
                      <span>{s.course.name}</span>
                      <span className="text-muted-foreground">@ {s.college.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education"><StudentEducationTab studentId={studentId} /></TabsContent>
        <TabsContent value="documents"><StudentDocumentsTab studentId={studentId} /></TabsContent>
        <TabsContent value="timeline"><StudentTimelineTab studentId={studentId} /></TabsContent>
        <TabsContent value="applications">
          <Card>
            <CardContent className="pt-4">
              {overview.applications.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No applications yet.</p>
              ) : (
                <ul className="divide-y">
                  {overview.applications.map((a) => (
                    <li key={a.id} className="py-3 flex justify-between text-sm">
                      <span>{a.course.name} @ {a.college.name}</span>
                      <Badge variant="outline">{a.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="shortlist"><StudentShortlistTab studentId={studentId} /></TabsContent>
        <TabsContent value="consent"><StudentConsentTab studentId={studentId} /></TabsContent>
      </Tabs>
    </div>
  );
}
