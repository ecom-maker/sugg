import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { CreateBranchForm } from "@/components/agency/create-branch-form";

export const metadata: Metadata = { title: "Edit Branch" };

export default async function EditBranchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["AGENCY_OWNER", "AGENCY_ADMIN", "SUPER_ADMIN"]);
  const { id } = await params;

  const branch = await prisma.agencyBranch.findFirst({
    where: {
      id,
      ...(user.role === "SUPER_ADMIN"
        ? {}
        : {
            agency: {
              OR: [
                { owner: { supabaseId: user.supabaseId } },
                { agencyUsers: { some: { user: { supabaseId: user.supabaseId } } } },
              ],
            },
          }),
    },
    select: {
      id: true,
      branchName: true,
      branchCode: true,
      city: true,
      state: true,
      country: true,
      postalCode: true,
      phone: true,
      email: true,
      address: true,
    },
  });

  if (!branch) notFound();

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Link href={`/agency/branches/${branch.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to branch
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Edit Branch</h1>
        <p className="text-muted-foreground text-sm mt-1">{branch.branchName}</p>
      </div>
      <CreateBranchForm branch={branch} />
    </div>
  );
}
