import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Payouts" };

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PROCESSED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default async function AdminPayoutsPage() {
  await requireRole(["SUPER_ADMIN"]);

  const payouts = await prisma.commissionTransaction.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      college: { select: { name: true } },
      agency: { select: { name: true } },
      student: { select: { fullName: true } },
    },
  });

  const totalPending = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + Number(p.commissionAmount), 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payouts</h1>
        <p className="text-muted-foreground text-sm mt-1">
          ₹{totalPending.toLocaleString("en-IN")} pending approval
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Student</th>
              <th className="text-left px-4 py-3 font-medium">College</th>
              <th className="text-left px-4 py-3 font-medium">Agency</th>
              <th className="text-left px-4 py-3 font-medium">Amount</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payouts.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No payouts yet</td></tr>
            ) : (
              payouts.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.student.fullName}</td>
                  <td className="px-4 py-3">{p.college?.name ?? "—"}</td>
                  <td className="px-4 py-3">{p.agency?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold">₹{Number(p.commissionAmount).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.commissionType}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] ?? ""}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
