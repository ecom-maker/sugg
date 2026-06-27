import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DollarSign } from "lucide-react";

export const metadata: Metadata = { title: "Commissions" };

export default async function CollegeCommissionsPage() {
  const user = await requireRole(["COLLEGE_ADMIN"]);

  const college = await prisma.college.findFirst({
    where: { users: { some: { supabaseId: user.supabaseId } } },
  });

  const commissions = college
    ? await prisma.commissionTransaction.findMany({
        where: { collegeId: college.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { student: { select: { fullName: true } } },
      })
    : [];

  const total = commissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commissions</h1>
        <p className="text-muted-foreground text-sm mt-1">Total: ₹{total.toLocaleString("en-IN")}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(["PENDING", "APPROVED", "PROCESSED"] as const).map((status) => {
          const count = commissions.filter((c) => c.status === status);
          const sum = count.reduce((s, c) => s + Number(c.commissionAmount), 0);
          return (
            <div key={status} className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{status}</p>
              <p className="text-xl font-bold mt-1">₹{sum.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground">{count.length} transactions</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Student</th>
              <th className="text-left px-4 py-3 font-medium">Amount</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {commissions.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">No commissions yet</td></tr>
            ) : (
              commissions.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.student.fullName}</td>
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
