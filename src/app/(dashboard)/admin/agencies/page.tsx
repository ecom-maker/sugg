import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Building2, Globe, Mail } from "lucide-react";

export const metadata: Metadata = { title: "Agencies" };

export default async function AdminAgenciesPage() {
  await requireRole(["SUPER_ADMIN"]);

  const agencies = await prisma.agency.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { agencyUsers: true, commissions: true } },
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agencies</h1>
        <p className="text-muted-foreground text-sm mt-1">{agencies.length} partner agencies</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agencies.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground border rounded-lg">
            No agencies yet.
          </div>
        ) : (
          agencies.map((agency) => (
            <div key={agency.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{agency.name}</p>
                  <p className="text-xs text-muted-foreground">{agency.city ?? ""}{agency.country ? `, ${agency.country}` : ""}</p>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${agency.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {agency.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {agency.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{agency.email}</div>}
                {agency.website && <div className="flex items-center gap-2"><Globe className="w-3 h-3" />{agency.website}</div>}
              </div>
              <div className="pt-2 border-t flex justify-between text-xs text-muted-foreground">
                <span>{agency._count.agencyUsers} staff</span>
                <span>{agency._count.commissions} commissions</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
