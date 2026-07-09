import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";

export const metadata: Metadata = { title: "Referred Students" };

export default async function AgencyStudentsPage() {
  const user = await requireRole(["AGENCY_ADMIN", "AGENCY_COUNSELOR"]);

  const agency = await prisma.agency.findFirst({
    where: { OR: [{ owner: { supabaseId: user.supabaseId } }, { agencyUsers: { some: { user: { supabaseId: user.supabaseId } } } }] },
  });

  const referrals = agency
    ? await prisma.studentReferral.findMany({
        where: { agencyId: agency.id },
        orderBy: { createdAt: "desc" },
        include: { student: { select: { name: true, email: true, mobile: true } } },
      })
    : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referred Students</h1>
        <p className="text-muted-foreground text-sm mt-1">{referrals.length} students referred</p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Student</th>
              <th className="text-left px-4 py-3 font-medium">Contact</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {referrals.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-12 text-muted-foreground">
                <Users className="w-6 h-6 mx-auto mb-1 opacity-30" />
                No students referred yet
              </td></tr>
            ) : (
              referrals.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{r.student.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.student.email ?? r.student.mobile}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
