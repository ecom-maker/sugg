import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AgencyStaffEditForm } from "@/components/agency/agency-staff-edit-form";
import { ChangeHistory } from "@/components/shared/change-history";

export const metadata: Metadata = { title: "Edit Staff" };

export default async function EditAgencyStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["AGENCY_OWNER", "SUPER_ADMIN"]);
  const { id } = await params;

  const agencyUser = await prisma.agencyUser.findFirst({
    where: {
      userId: id,
      ...(user.role === "SUPER_ADMIN" ? {} : { agency: { owner: { supabaseId: user.supabaseId } } }),
    },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true, role: true, isActive: true } },
      agency: {
        select: {
          branches: { orderBy: { branchName: "asc" }, select: { id: true, branchName: true, branchCode: true } },
        },
      },
    },
  });

  if (!agencyUser) redirect("/agency/staff");

  const branchOptions = agencyUser.agency.branches.map((b) => ({
    value: b.id,
    label: `${b.branchName} (${b.branchCode})`,
  }));

  const history = await prisma.auditLog.findMany({
    where: { resource: "agency_user", resourceId: agencyUser.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, action: true, oldValue: true, newValue: true, createdAt: true, user: { select: { fullName: true, email: true } } },
  });

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
        <Link href="/agency/staff">
          <ArrowLeft className="w-4 h-4" /> Back to staff
        </Link>
      </Button>
      <AgencyStaffEditForm
        staff={{
          userId: agencyUser.user.id,
          fullName: agencyUser.user.fullName,
          email: agencyUser.user.email,
          phone: agencyUser.user.phone,
          role: agencyUser.user.role,
          isActive: agencyUser.user.isActive,
          branchId: agencyUser.branchId,
          isOwner: agencyUser.user.role === "AGENCY_OWNER",
        }}
        branchOptions={branchOptions}
      />
      <ChangeHistory entries={history} title="Change history" />
    </div>
  );
}
