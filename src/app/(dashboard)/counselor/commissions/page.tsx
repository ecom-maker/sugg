import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DollarSign } from "lucide-react";

export const metadata: Metadata = { title: "My Commissions" };

export default async function CounselorCommissionsPage() {
  const user = await requireRole(["AGENCY_COUNSELOR", "BRANCH_MANAGER", "SUGG_COUNSELOR", "SUPER_ADMIN"]);

  const commissions = await prisma.commissionTransaction.findMany({
    where: { counselor: { supabaseId: user.supabaseId } },
    orderBy: { createdAt: "desc" },
    include: {
      application: { include: { student: { select: { name: true } } } },
      college: { select: { name: true } },
    },
  });

  const totalEarned = commissions.reduce((s, c) => s + Number(c.commissionAmount), 0);
  const totalPaid = commissions.filter(c => c.status === "PAID").reduce((s, c) => s + Number(c.commissionAmount), 0);
  const totalPending = commissions.filter(c => c.status === "PENDING").reduce((s, c) => s + Number(c.commissionAmount), 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Commissions</h1>
        <p className="text-muted-foreground text-sm mt-1">Your commission history</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Earned", value: totalEarned, color: "text-emerald-700" },
          { label: "Paid", value: totalPaid, color: "text-green-700" },
          { label: "Pending", value: totalPending, color: "text-yellow-700" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">{s.label}</span>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>₹{s.value.toLocaleString("en-IN")}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Student</th>
              <th className="text-left px-4 py-3 font-medium">College</th>
              <th className="text-right px-4 py-3 font-medium">Amount</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {commissions.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No commissions yet</td></tr>
            ) : (
              commissions.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.application.student.name}</td>
                  <td className="px-4 py-3">{c.college?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">₹{Number(c.commissionAmount).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.status === "PAID" ? "bg-green-100 text-green-700"
                      : c.status === "APPROVED" ? "bg-blue-100 text-blue-700"
                      : "bg-yellow-100 text-yellow-700"
                    }`}>{c.status}</span>
                  </td>
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
