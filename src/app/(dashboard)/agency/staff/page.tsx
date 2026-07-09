import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users, Mail, Phone } from "lucide-react";

export const metadata: Metadata = { title: "All Staff" };

export default async function AgencyStaffPage() {
  const user = await requireRole(["AGENCY_OWNER", "AGENCY_ADMIN", "SUPER_ADMIN"]);

  const agency = await prisma.agency.findFirst({
    where: {
      OR: [
        { owner: { supabaseId: user.supabaseId } },
        { agencyUsers: { some: { user: { supabaseId: user.supabaseId } } } },
      ],
    },
    include: {
      agencyUsers: {
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true, role: true, isActive: true } },
          branch: { select: { branchName: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const staff = agency?.agencyUsers ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All Staff</h1>
        <p className="text-muted-foreground text-sm mt-1">{staff.length} team members across all branches</p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Branch</th>
              <th className="text-left px-4 py-3 font-medium">Contact</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {staff.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">
                <Users className="w-6 h-6 mx-auto mb-1 opacity-30" />No staff yet
              </td></tr>
            ) : (
              staff.map(({ user: u, branch }) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                        {u.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.role.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{branch?.branchName ?? <span className="text-muted-foreground">Unassigned</span>}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {u.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</div>}
                    {u.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{u.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
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
