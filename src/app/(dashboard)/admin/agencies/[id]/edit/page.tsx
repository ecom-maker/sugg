import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AgencyForm } from "@/components/agencies/agency-form";

export const metadata: Metadata = { title: "Edit Agency" };

export default async function EditAgencyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["SUPER_ADMIN"]);
  const { id } = await params;

  const agency = await prisma.agency.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      website: true,
      registrationNumber: true,
      ownerName: true,
      ownerMobile: true,
      ownerEmail: true,
      nationalIdType: true,
      nationalIdNumber: true,
      specialization: true,
      headquarters: true,
      address: true,
      city: true,
      countryId: true,
      stateId: true,
      districtId: true,
      isActive: true,
      approvalStatus: true,
    },
  });

  if (!agency) notFound();

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
        <Link href={`/admin/agencies/${agency.id}`}>
          <ArrowLeft className="w-4 h-4" /> Back to agency
        </Link>
      </Button>
      <AgencyForm agency={agency} />
    </div>
  );
}
