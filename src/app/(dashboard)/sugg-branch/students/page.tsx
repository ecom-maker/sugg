import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSuggBranchScope, getScopedAgencyIds } from "@/lib/sugg-branch-scope";
import { Users } from "lucide-react";

export const metadata: Metadata = { title: "Branch Students" };

// Students of the agencies mapped under this Sugg Branch.
export default async function BranchStudentsPage() {
  const user = await requireRole(["SUGG_BRANCH_MANAGER", "SUPER_ADMIN"]);
  const scope = await getSuggBranchScope(user);

  const agencyIds = scope ? await getScopedAgencyIds(scope.suggBranchId) : [];
  const students = agencyIds.length
    ? await prisma.student.findMany({
        where: { agencyId: { in: agencyIds }, isActive: true },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { agency: { select: { name: true } } },
      })
    : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Students</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {scope ? `${students.length} students across ${scope.branchName}'s agencies` : "No Sugg Branch assigned to you yet."}
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mobile</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Interested Course</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Agency</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">City</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />No students in this branch yet.
              </td></tr>
            ) : students.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.mobile}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{s.interestedCourse ?? "—"}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{s.agency?.name ?? "—"}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{s.city ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
