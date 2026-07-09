import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";

export const metadata: Metadata = { title: "Branch Leads" };

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-yellow-100 text-yellow-700",
  QUALIFIED: "bg-purple-100 text-purple-700",
  COUNSELING_SCHEDULED: "bg-orange-100 text-orange-700",
  APPLICATION_SUBMITTED: "bg-teal-100 text-teal-700",
  OFFER_RECEIVED: "bg-cyan-100 text-cyan-700",
  ADMISSION_CONFIRMED: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
};

export default async function BranchLeadsPage() {
  const user = await requireRole(["BRANCH_MANAGER", "SUPER_ADMIN"]);

  const branch = await prisma.agencyBranch.findFirst({
    where: { manager: { supabaseId: user.supabaseId } },
  });

  const leads = branch
    ? await prisma.lead.findMany({
        where: { branchId: branch.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          student: { select: { name: true, mobile: true, email: true } },
          assignedTo: { select: { fullName: true } },
        },
      })
    : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Branch Leads</h1>
        <p className="text-muted-foreground text-sm mt-1">{leads.length} leads in {branch?.branchName ?? "your branch"}</p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Student</th>
              <th className="text-left px-4 py-3 font-medium">Contact</th>
              <th className="text-left px-4 py-3 font-medium">Assigned To</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leads.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">
                <Users className="w-6 h-6 mx-auto mb-1 opacity-30" />No leads yet
              </td></tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{lead.student.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    <div>{lead.student.mobile}</div>
                    <div>{lead.student.email ?? ""}</div>
                  </td>
                  <td className="px-4 py-3">{lead.assignedTo?.fullName ?? <span className="text-muted-foreground">Unassigned</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {lead.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
