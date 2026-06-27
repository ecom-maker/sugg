import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Briefcase, Globe, Mail, Phone, MapPin } from "lucide-react";

export const metadata: Metadata = { title: "Agency Profile" };

export default async function AgencyProfilePage() {
  const user = await requireRole(["AGENCY_ADMIN"]);

  const agency = await prisma.agency.findFirst({
    where: { admin: { supabaseId: user.supabaseId } },
  });

  if (!agency) {
    return (
      <div className="p-6 text-center py-16 text-muted-foreground">
        <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No agency profile found. Contact admin.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Agency Profile</h1>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-purple-50 flex items-center justify-center">
            <Briefcase className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{agency.name}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${agency.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {agency.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        <div className="grid gap-3 pt-4 border-t text-sm">
          {agency.email && <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-muted-foreground" />{agency.email}</div>}
          {agency.phone && <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-muted-foreground" />{agency.phone}</div>}
          {agency.website && <div className="flex items-center gap-3"><Globe className="w-4 h-4 text-muted-foreground" /><a href={agency.website} className="text-primary hover:underline" target="_blank">{agency.website}</a></div>}
          {(agency.city ?? agency.country) && <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-muted-foreground" />{[agency.city, agency.country].filter(Boolean).join(", ")}</div>}
        </div>
      </div>
    </div>
  );
}
