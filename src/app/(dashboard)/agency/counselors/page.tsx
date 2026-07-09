import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserCheck, Mail, Phone } from "lucide-react";

export const metadata: Metadata = { title: "Agency Counselors" };

export default async function AgencyCounselorsPage() {
  const user = await requireRole(["AGENCY_OWNER", "AGENCY_ADMIN", "SUPER_ADMIN"]);

  const agency = await prisma.agency.findFirst({
    where: { OR: [{ owner: { supabaseId: user.supabaseId } }, { agencyUsers: { some: { user: { supabaseId: user.supabaseId } } } }] },
    include: {
      agencyUsers: {
        include: { user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true } } },
      },
    },
  });

  const counselors = (agency?.agencyUsers ?? []).map((au) => au.user);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Counselors</h1>
        <p className="text-muted-foreground text-sm mt-1">{counselors.length} in your agency</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {counselors.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground border rounded-lg">
            <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No counselors in your agency yet
          </div>
        ) : (
          counselors.map((c) => (
            <div key={c.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-semibold text-sm">
                  {c.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{c.fullName}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {c.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {c.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{c.email}</div>}
                {c.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{c.phone}</div>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
