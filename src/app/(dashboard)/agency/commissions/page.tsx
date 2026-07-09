import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DollarSign } from "lucide-react";

export const metadata: Metadata = { title: "Commissions" };

export default async function AgencyCommissionsPage() {
  const user = await requireRole(["AGENCY_ADMIN"]);

  const agency = await prisma.agency.findFirst({
    where: { OR: [{ owner: { supabaseId: user.supabaseId } }, { agencyUsers: { some: { user: { supabaseId: user.supabaseId } } } }] },
  });

  const commissions = agency
    ? await prisma.commissionTransaction.findMany({
        where: { agencyId: agency.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          college: { select: { name: true } },
          application: { include: { student: { select: { name: true } } } },
        },
      })
    : [];

  const totalEarned = commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + Number(c.commissionAmount), 0);
  const totalPending = commissions.filter((c) => c.status === "PENDING").reduce((s, c) => s + Number(c.commissionAmount), 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commissions</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1"><DollarSign className="w-4 h-4" /><span className="text-sm">Paid</span></div>
          <p className="text-2xl font-bold">₹{totalEarned.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-yellow-600 mb-1"><DollarSign className="w-4 h-4" /><span className="text-sm">Pending</span></div>
          <p className="text-2xl font-bold">₹{totalPending.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Student</th>
              <th className="text-left px-4 py-3 font-medium">College</th>
              <th className="text-left px-4 py-3 font-medium">Amount</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {commissions.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No commissions yet</td></tr>
            ) : (
              commissions.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.application.student.name}</td>
                  <td className="px-4 py-3">{c.college?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold">₹{Number(c.commissionAmount).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{c.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
