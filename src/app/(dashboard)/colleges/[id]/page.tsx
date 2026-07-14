import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Building2, Globe, MapPin, GraduationCap } from "lucide-react";

export const metadata: Metadata = { title: "College" };

function money(v: unknown) {
  const n = Number(v ?? 0);
  return n > 0 ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n) : "—";
}

// Read-only college view — any authenticated user (opened from Recommended Colleges).
export default async function CollegeViewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const college = await prisma.college.findUnique({
    where: { id },
    include: {
      university: { select: { name: true } },
      courses: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, degreeType: true, duration: true, totalFee: true, annualFee: true },
      },
    },
  });
  if (!college || college.status !== "APPROVED") notFound();

  const location = [college.city, college.state, college.country].filter(Boolean).join(", ");

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{college.name}</h1>
          {college.university && <p className="text-sm text-muted-foreground">{college.university.name}</p>}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-2 text-sm">
        {location && (
          <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4" />{location}</div>
        )}
        {college.website && (
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <a href={college.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {college.website}
            </a>
          </div>
        )}
        {college.establishedYear && <p className="text-muted-foreground">Established {college.establishedYear}</p>}
        {college.description && <p className="pt-2">{college.description}</p>}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Courses ({college.courses.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Course</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Degree</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Duration</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Total Fee</th>
              </tr>
            </thead>
            <tbody>
              {college.courses.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No courses listed.</td></tr>
              ) : college.courses.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{c.name}</td>
                  <td className="px-4 py-2.5"><Badge variant="secondary">{c.degreeType}</Badge></td>
                  <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">{c.duration}</td>
                  <td className="px-4 py-2.5 text-right">{money(c.totalFee ?? c.annualFee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
