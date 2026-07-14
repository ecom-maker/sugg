import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { CollegeProfileForm } from "@/components/college/profile-form";
import { CollegeResetPassword } from "@/components/college/college-reset-password";

export const metadata: Metadata = { title: "Edit College" };

export default async function AdminCollegeEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["SUPER_ADMIN"]);
  const { id } = await params;

  const college = await prisma.college.findUnique({
    where: { id },
    select: {
      id: true, name: true, website: true, officialEmail: true, contactPhone: true,
      contactPersonName: true, contactPersonDesig: true, contactPersonPhone: true,
      address: true, city: true, state: true, country: true, pincode: true,
      description: true, establishedYear: true, universityId: true, status: true,
      admin: { select: { email: true } },
    },
  });
  if (!college) notFound();

  const loginEmail = college.admin?.email ?? college.officialEmail ?? null;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <Link href={`/admin/colleges/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to college
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Edit College</h1>
        <p className="text-muted-foreground text-sm mt-1">Update {college.name}&apos;s details.</p>
      </div>
      <CollegeProfileForm college={college} />

      <CollegeResetPassword collegeId={college.id} loginEmail={loginEmail} />
    </div>
  );
}
