import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SuggBranchForm } from "@/components/sugg-branches/sugg-branch-form";

export const metadata: Metadata = { title: "Edit Sugg Branch" };

export default async function EditSuggBranchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["SUPER_ADMIN"]);
  const { id } = await params;

  const branch = await prisma.suggBranch.findUnique({
    where: { id },
    select: {
      id: true,
      branchName: true,
      branchCode: true,
      address: true,
      phone: true,
      email: true,
      countryId: true,
      stateId: true,
      districtId: true,
      managerId: true,
      status: true,
    },
  });

  if (!branch) notFound();

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
        <Link href={`/admin/sugg-branches/${branch.id}`}>
          <ArrowLeft className="w-4 h-4" /> Back to branch
        </Link>
      </Button>
      <SuggBranchForm branch={branch} />
    </div>
  );
}
