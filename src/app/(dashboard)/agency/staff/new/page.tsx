import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { AgencyStaffForm } from "@/components/agency/agency-staff-form";

export const metadata: Metadata = { title: "Add Staff" };

export default async function NewAgencyStaffPage() {
  const user = await requireRole(["AGENCY_OWNER", "SUPER_ADMIN"]);

  const agency = await prisma.agency.findFirst({
    where: { owner: { supabaseId: user.supabaseId } },
    select: {
      id: true,
      name: true,
      branches: { orderBy: { branchName: "asc" }, select: { id: true, branchName: true, branchCode: true } },
    },
  });
  if (!agency) redirect("/agency");

  const branchOptions = agency.branches.map((b) => ({
    value: b.id,
    label: `${b.branchName} (${b.branchCode})`,
  }));

  return (
    <div className="p-6 space-y-4">
      <Link href="/agency/staff" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to staff
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Add Staff</h1>
        <p className="text-muted-foreground text-sm mt-1">Add a team member to {agency.name} and create their login.</p>
      </div>
      <AgencyStaffForm branchOptions={branchOptions} />
    </div>
  );
}
