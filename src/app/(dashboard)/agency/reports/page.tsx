import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Agency Reports" };

export default async function AgencyReportsPage() {
  const user = await requireRole(["AGENCY_OWNER", "AGENCY_ADMIN", "SUPER_ADMIN"]);

  const agency = await prisma.agency.findFirst({
    where: {
      OR: [
        { owner: { supabaseId: user.supabaseId } },
        { agencyUsers: { some: { user: { supabaseId: user.supabaseId } } } },
      ],
    },
    include: {
      branches: {
        include: { _count: { select: { leads: true, students: true, applications: true } } },
        orderBy: { branchName: "asc" },
      },
    },
  });

  const branches = agency?.branches ?? [];

  const branchStats = await Promise.all(
    branches.map(async (b) => {
      const [admissions, commissions, lostLeads, conversionLeads] = await Promise.all([
        prisma.application.count({ where: { branchId: b.id, status: "ENROLLED" } }),
        prisma.commissionTransaction.aggregate({ where: { branchId: b.id }, _sum: { commissionAmount: true } }),
        prisma.lead.count({ where: { branchId: b.id, status: "LOST" } }),
        prisma.lead.count({ where: { branchId: b.id, status: "ADMISSION_CONFIRMED" } }),
      ]);
      const conversionRate = b._count.leads > 0 ? Math.round((conversionLeads / b._count.leads) * 100) : 0;
      return {
        branch: b,
        admissions,
        commission: Number(commissions._sum.commissionAmount ?? 0),
        lostLeads,
        conversionRate,
      };
    })
  );

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Agency Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">{agency?.name} · Branch-level breakdown</p>
      </div>

      {/* Admissions by Branch */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold mb-4">Admissions by Branch</h2>
        <div className="space-y-3">
          {branchStats.map(({ branch, admissions }) => {
            const maxAdmissions = Math.max(...branchStats.map(b => b.admissions), 1);
            const pct = Math.round((admissions / maxAdmissions) * 100);
            return (
              <div key={branch.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{branch.branchName}</span>
                  <span className="text-muted-foreground">{admissions} admissions</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {branchStats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>}
        </div>
      </div>

      {/* Revenue by Branch */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold mb-4">Revenue (Commission) by Branch</h2>
        <div className="space-y-3">
          {branchStats.map(({ branch, commission }) => {
            const maxComm = Math.max(...branchStats.map(b => b.commission), 1);
            const pct = Math.round((commission / maxComm) * 100);
            return (
              <div key={branch.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{branch.branchName}</span>
                  <span className="text-emerald-700 font-semibold">₹{commission.toLocaleString("en-IN")}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Comparison Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Branch Comparison</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Branch</th>
              <th className="text-right px-4 py-3 font-medium">Leads</th>
              <th className="text-right px-4 py-3 font-medium">Students</th>
              <th className="text-right px-4 py-3 font-medium">Admissions</th>
              <th className="text-right px-4 py-3 font-medium">Lost</th>
              <th className="text-right px-4 py-3 font-medium">Conv.%</th>
              <th className="text-right px-4 py-3 font-medium">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {branchStats.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No branch data yet</td></tr>
            ) : (
              branchStats.map(({ branch, admissions, commission, lostLeads, conversionRate }) => (
                <tr key={branch.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{branch.branchName}</p>
                    <p className="text-xs text-muted-foreground">{branch.branchCode}</p>
                  </td>
                  <td className="px-4 py-3 text-right">{branch._count.leads}</td>
                  <td className="px-4 py-3 text-right">{branch._count.students}</td>
                  <td className="px-4 py-3 text-right font-semibold">{admissions}</td>
                  <td className="px-4 py-3 text-right text-red-600">{lostLeads}</td>
                  <td className="px-4 py-3 text-right">{conversionRate}%</td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-semibold">₹{commission.toLocaleString("en-IN")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
