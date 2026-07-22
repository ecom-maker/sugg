import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Building2, Globe } from "lucide-react";

export const metadata: Metadata = { title: "Colleges" };

// Read-only list of all approved colleges for agency users to browse.
export default async function AgencyCollegesPage() {
  await requireRole([
    "AGENCY_OWNER",
    "AGENCY_ADMIN",
    "BRANCH_MANAGER",
    "AGENCY_COUNSELOR",
    "SUPER_ADMIN",
  ]);

  const colleges = await prisma.college.findMany({
    where: { status: "APPROVED" },
    orderBy: { name: "asc" },
    take: 500,
    include: {
      university: { select: { name: true } },
      _count: { select: { courses: true } },
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Colleges</h1>
        <p className="text-muted-foreground text-sm mt-1">{colleges.length} colleges</p>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">College</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">University</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Location</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Courses</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Website</th>
            </tr>
          </thead>
          <tbody>
            {colleges.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />No colleges available yet.
              </td></tr>
            ) : colleges.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link href={`/colleges/${c.id}`} className="font-medium hover:text-primary transition-colors">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{c.university?.name ?? "—"}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                  {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-right text-muted-foreground">{c._count.courses}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                  {c.website ? (
                    <a href={c.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
                      <Globe className="w-3 h-3" />{c.website}
                    </a>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
