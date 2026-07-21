import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Briefcase } from "lucide-react";
import { AgencyProfileForm } from "@/components/agency/agency-profile-form";

export const metadata: Metadata = { title: "Agency Profile" };

export default async function AgencyProfilePage() {
  const user = await requireRole([
    "AGENCY_OWNER",
    "AGENCY_ADMIN",
    "BRANCH_MANAGER",
    "AGENCY_COUNSELOR",
    "SUPER_ADMIN",
  ]);

  const agency = await prisma.agency.findFirst({
    where: { OR: [{ owner: { supabaseId: user.supabaseId } }, { agencyUsers: { some: { user: { supabaseId: user.supabaseId } } } }] },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      website: true,
      address: true,
      city: true,
      state: true,
      country: true,
      isActive: true,
    },
  });

  if (!agency) {
    return (
      <div className="p-6 text-center py-16 text-muted-foreground">
        <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No agency profile found. Contact admin.</p>
      </div>
    );
  }

  const canEdit = user.role === "AGENCY_OWNER" || user.role === "SUPER_ADMIN";

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Agency Profile</h1>
      </div>
      <AgencyProfileForm agency={agency} canEdit={canEdit} />
    </div>
  );
}
