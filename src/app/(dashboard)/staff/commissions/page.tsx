import type { Metadata } from "next";
import { requireCapabilityOrRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";

export const metadata: Metadata = { title: "Commissions" };

const statusVariant: Record<string, "success" | "warning" | "secondary" | "destructive"> = {
  PAID: "success",
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "destructive",
  CANCELLED: "secondary",
};

function money(v: unknown) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

// Read-only commissions view. Reachable by SUPER_ADMIN, or any user granted the
// VIEW_COMMISSIONS capability (e.g. an HR employee). No approve/pay actions.
export default async function StaffCommissionsPage() {
  await requireCapabilityOrRole(["SUPER_ADMIN"], "VIEW_COMMISSIONS");

  const [transactions, agg] = await Promise.all([
    prisma.commissionTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        college: { select: { name: true } },
        agency: { select: { name: true } },
        application: { select: { student: { select: { name: true } } } },
      },
    }),
    prisma.commissionTransaction.aggregate({ _sum: { commissionAmount: true }, _count: true }),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Commissions</h1>
          <p className="text-muted-foreground text-sm">
            {agg._count} records · {money(agg._sum.commissionAmount)} total · read-only
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">College</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Agency</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Commission</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                  No commission records yet.
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">{t.application?.student?.name ?? "—"}</td>
                  <td className="px-4 py-3">{t.college?.name ?? "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{t.agency?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{money(t.commissionAmount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[t.status] ?? "secondary"}>{t.status}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
