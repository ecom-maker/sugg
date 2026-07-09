import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Users } from "lucide-react";

export const metadata: Metadata = { title: "Branch Students" };

export default async function BranchStudentsPage() {
  const user = await requireRole(["BRANCH_MANAGER", "SUPER_ADMIN"]);

  const branch = await prisma.agencyBranch.findFirst({
    where: { manager: { supabaseId: user.supabaseId } },
  });

  const students = branch
    ? await prisma.student.findMany({
        where: { branchId: branch.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          leads: {
            where: { isCurrent: true },
            take: 1,
            select: { status: true, assignedTo: { select: { fullName: true } } },
          },
        },
      })
    : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Branch Students</h1>
        <p className="text-muted-foreground text-sm mt-1">{students.length} students</p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Mobile</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Counselor</th>
              <th className="text-left px-4 py-3 font-medium">Lead Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {students.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">
                <Users className="w-6 h-6 mx-auto mb-1 opacity-30" />No students yet
              </td></tr>
            ) : (
              students.map((s) => {
                const lead = s.leads[0];
                return (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/students/${s.id}`} className="hover:text-primary">{s.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.mobile}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email ?? "—"}</td>
                  <td className="px-4 py-3">{lead?.assignedTo?.fullName ?? "—"}</td>
                  <td className="px-4 py-3">
                    {lead?.status ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{lead.status.replace(/_/g, " ")}</span>
                    ) : "—"}
                  </td>
                </tr>
              );})
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
