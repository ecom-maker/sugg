import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Phone } from "lucide-react";

export const metadata: Metadata = { title: "Counselors" };

export default async function AdminCounselorsPage() {
  await requireRole(["SUPER_ADMIN"]);

  const counselors = await prisma.user.findMany({
    where: { role: { in: ["SUGG_COUNSELOR", "AGENCY_COUNSELOR"] } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { assignedLeads: true } },
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Counselors</h1>
          <p className="text-muted-foreground text-sm mt-1">{counselors.length} counselors</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" />Add Counselor</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {counselors.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground border rounded-lg">
            No counselors yet. Add your first counselor.
          </div>
        ) : (
          counselors.map((c) => (
            <div key={c.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {c.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{c.fullName}</p>
                  <p className="text-xs text-muted-foreground">{c.role.replace(/_/g, " ")}</p>
                </div>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {c.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {c.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{c.email}</div>}
                {c.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{c.phone}</div>}
              </div>
              <div className="pt-2 border-t flex justify-between text-sm">
                <span className="text-muted-foreground">Assigned Leads</span>
                <span className="font-semibold">{c._count.assignedLeads}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
