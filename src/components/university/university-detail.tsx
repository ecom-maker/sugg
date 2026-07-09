"use client";

import Link from "next/link";
import {
  GraduationCap,
  Building2,
  BookOpen,
  Users,
  FileText,
  Globe,
  MapPin,
  Calendar,
  Pencil,
  Archive,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  archiveUniversity,
  setUniversityStatus,
} from "@/actions/universities";
import { toast } from "@/hooks/use-toast";
import type { UniversityStatus, UniversityType } from "@/types";

interface CollegeSummary {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  status: string;
  logoUrl: string | null;
  _count: { courses: number; applications: number };
}

interface UniversityDetail {
  id: string;
  name: string;
  establishmentYear: number;
  location: string;
  city: string | null;
  state: string | null;
  country: string;
  website: string | null;
  universityType: UniversityType | null;
  accreditation: string | null;
  logoUrl: string | null;
  description: string | null;
  status: UniversityStatus;
  createdAt: Date;
  updatedAt: Date;
  colleges: CollegeSummary[];
  _count: { colleges: number };
  createdBy: { fullName: string } | null;
  updatedBy: { fullName: string } | null;
}

const TYPE_LABELS: Record<UniversityType, string> = {
  PUBLIC: "Public",
  PRIVATE: "Private",
  DEEMED: "Deemed",
  AUTONOMOUS: "Autonomous",
  INTERNATIONAL: "International",
};

const STATUS_VARIANT: Record<UniversityStatus, "success" | "warning" | "outline"> = {
  ACTIVE: "success",
  INACTIVE: "warning",
  ARCHIVED: "outline",
};

export function UniversityDetailView({
  university,
  canManage = false,
}: {
  university: UniversityDetail;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const totalCourses = university.colleges.reduce((s, c) => s + c._count.courses, 0);
  const totalApplications = university.colleges.reduce((s, c) => s + c._count.applications, 0);
  const activeAdmissions = university.colleges
    .filter((c) => c.status === "APPROVED")
    .reduce((s, c) => s + c._count.applications, 0);

  const handleStatusChange = async (status: UniversityStatus) => {
    setLoading(true);
    const result = await setUniversityStatus(university.id, status);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Status updated" });
      router.refresh();
    }
    setLoading(false);
    setConfirmArchive(false);
  };

  const handleArchive = async () => {
    setLoading(true);
    const result = await archiveUniversity(university.id);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "University archived" });
      router.refresh();
    }
    setLoading(false);
    setConfirmArchive(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            {university.logoUrl ? (
              <img src={university.logoUrl} alt="" className="w-10 h-10 object-contain" />
            ) : (
              <GraduationCap className="w-7 h-7 text-indigo-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{university.name}</h1>
              <Badge variant={STATUS_VARIANT[university.status]}>{university.status}</Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Est. {university.establishmentYear} · {university.location}
              {university.city ? `, ${university.city}` : ""} · {university.country}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" asChild className="gap-2">
              <Link href={`/admin/universities/${university.id}/edit`}>
                <Pencil className="w-4 h-4" />
                Edit
              </Link>
            </Button>
            {university.status === "ACTIVE" && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleStatusChange("INACTIVE")}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Deactivate
              </Button>
            )}
            {university.status === "INACTIVE" && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleStatusChange("ACTIVE")}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Activate
              </Button>
            )}
            {university.status !== "ARCHIVED" && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setConfirmArchive(true)}
                disabled={loading}
              >
                <Archive className="w-4 h-4" />
                Archive
              </Button>
            )}
          </div>
        )}
      </div>

      {confirmArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-semibold">Archive University?</h3>
            <p className="text-sm text-muted-foreground">
              Archive &ldquo;{university.name}&rdquo;? It will be hidden from college selection but linked colleges remain.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmArchive(false)}>Cancel</Button>
              <Button onClick={handleArchive} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Archive
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Colleges", value: university._count.colleges, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total Courses", value: totalCourses, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Applications", value: totalApplications, icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Active Admissions", value: activeAdmissions, icon: Users, color: "text-green-600", bg: "bg-green-50" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { icon: Calendar, label: "Establishment Year", value: university.establishmentYear },
              { icon: MapPin, label: "Location", value: `${university.location}${university.city ? `, ${university.city}` : ""}, ${university.country}` },
              { icon: GraduationCap, label: "Type", value: university.universityType ? TYPE_LABELS[university.universityType] : "—" },
              { icon: Globe, label: "Website", value: university.website ? (
                <a href={university.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {university.website}
                </a>
              ) : "—" },
              { icon: FileText, label: "Accreditation", value: university.accreditation ?? "—" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <item.icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-medium">{item.value}</p>
                </div>
              </div>
            ))}
            {university.description && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm leading-relaxed">{university.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p>{new Date(university.createdAt).toLocaleString()}</p>
              {university.createdBy && (
                <p className="text-xs text-muted-foreground">by {university.createdBy.fullName}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Updated</p>
              <p>{new Date(university.updatedAt).toLocaleString()}</p>
              {university.updatedBy && (
                <p className="text-xs text-muted-foreground">by {university.updatedBy.fullName}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Colleges */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Linked Colleges ({university.colleges.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {university.colleges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No colleges linked to this university yet.
            </p>
          ) : (
            <div className="divide-y">
              {university.colleges.map((college) => (
                <div key={college.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <Link
                        href={`/admin/colleges/${college.id}`}
                        className="font-medium text-sm hover:text-primary"
                      >
                        {college.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {college.city ?? "—"}, {college.country ?? "—"} · {college._count.courses} courses · {college._count.applications} applications
                      </p>
                    </div>
                  </div>
                  <Badge variant={college.status === "APPROVED" ? "success" : "warning"}>
                    {college.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
