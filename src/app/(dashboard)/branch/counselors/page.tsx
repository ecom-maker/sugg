import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserCheck, Mail, Phone } from "lucide-react";

export const metadata: Metadata = { title: "Branch Counselors" };

export default async function BranchCounselorsPage() {
  const user = await requireRole(["BRANCH_MANAGER", "SUPER_ADMIN"]);

  const branch = await prisma.agencyBranch.findFirst({
    where: { manager: { supabaseId: user.supabaseId } },
    include: {
      agencyUsers: {
        include: {
          user: {
            select: {
              id: true, fullName: true, email: true, phone: true, isActive: true, role: true,
              assignedLeads: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  const counselors = branch?.agencyUsers ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Branch Counselors</h1>
        <p className="text-muted-foreground text-sm mt-1">{counselors.length} counselors in {branch?.branchName ?? "your branch"}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {counselors.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground border rounded-lg">
            <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No counselors assigned to this branch yet
          </div>
        ) : (
          counselors.map(({ user: c }) => (
            <div key={c.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-semibold text-sm">
                  {c.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.fullName}</p>
                  <p className="text-xs text-muted-foreground">{c.role.replace(/_/g, " ")}</p>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${c.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {c.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {c.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{c.email}</div>}
                {c.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{c.phone}</div>}
              </div>
              <div className="pt-2 border-t text-sm flex justify-between text-muted-foreground">
                <span>Assigned Leads</span>
                <span className="font-semibold text-foreground">{c.assignedLeads.length}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
