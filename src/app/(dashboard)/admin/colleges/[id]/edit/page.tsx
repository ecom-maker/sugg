import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CollegeProfileForm } from "@/components/college/profile-form";
import { CollegeResetPassword } from "@/components/college/college-reset-password";

export const metadata: Metadata = { title: "Edit College" };

function money(v: unknown) {
  const n = Number(v ?? 0);
  return n > 0 ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n) : "—";
}

export default async function AdminCollegeEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["SUPER_ADMIN"]);
  const { id } = await params;

  const college = await prisma.college.findUnique({
    where: { id },
    select: {
      id: true, name: true, website: true, officialEmail: true, contactPhone: true,
      contactPersonName: true, contactPersonDesig: true, contactPersonPhone: true,
      address: true, city: true, state: true, country: true, pincode: true,
      description: true, establishedYear: true, universityId: true, status: true,
      admin: { select: { email: true } },
    },
  });
  if (!college) notFound();

  const loginEmail = college.admin?.email ?? college.officialEmail ?? null;

  const courses = await prisma.course.findMany({
    where: { collegeId: id },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: { id: true, name: true, degreeType: true, duration: true, totalFee: true, annualFee: true, isActive: true },
  });

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <Link href={`/admin/colleges/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to college
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Edit College</h1>
        <p className="text-muted-foreground text-sm mt-1">Update {college.name}&apos;s details.</p>
      </div>
      <CollegeProfileForm college={college} />

      {/* Courses offered */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Courses offered ({courses.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Course</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Degree</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Duration</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Total Fee</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No courses added for this college yet.</td></tr>
              ) : courses.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{c.name}</td>
                  <td className="px-4 py-2.5"><Badge variant="secondary">{c.degreeType}</Badge></td>
                  <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">{c.duration}</td>
                  <td className="px-4 py-2.5 text-right">{money(c.totalFee ?? c.annualFee)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CollegeResetPassword collegeId={college.id} loginEmail={loginEmail} />
    </div>
  );
}
