import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DollarSign } from "lucide-react";

export const metadata: Metadata = { title: "Branch Commissions" };

export default async function BranchCommissionsPage() {
  const user = await requireRole(["BRANCH_MANAGER", "SUPER_ADMIN"]);

  const branch = await prisma.agencyBranch.findFirst({
    where: { manager: { supabaseId: user.supabaseId } },
  });

  const commissions = branch
    ? await prisma.commissionTransaction.findMany({
        where: { branchId: branch.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          college: { select: { name: true } },
          counselor: { select: { fullName: true } },
          application: { include: { student: { select: { name: true } } } },
        },
      })
    : [];

  const totalByStatus = {
    PENDING: commissions.filter(c => c.status === "PENDING").reduce((s, c) => s + Number(c.commissionAmount), 0),
    APPROVED: commissions.filter(c => c.status === "APPROVED").reduce((s, c) => s + Number(c.commissionAmount), 0),
    PAID: commissions.filter(c => c.status === "PAID").reduce((s, c) => s + Number(c.commissionAmount), 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Branch Commissions</h1>
        <p className="text-muted-foreground text-sm mt-1">{branch?.branchName}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {Object.entries(totalByStatus).map(([status, amount]) => (
          <div key={status} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{status}</span>
            </div>
            <p className="text-xl font-bold">₹{amount.toLocaleString("en-IN")}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Student</th>
              <th className="text-left px-4 py-3 font-medium">College</th>
              <th className="text-left px-4 py-3 font-medium">Counselor</th>
              <th className="text-left px-4 py-3 font-medium">Amount</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {commissions.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No commissions yet</td></tr>
            ) : (
              commissions.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.application.student.name}</td>
                  <td className="px-4 py-3">{c.college?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.counselor?.fullName ?? "—"}</td>
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
