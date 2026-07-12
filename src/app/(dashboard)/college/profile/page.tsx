import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CollegeProfileForm } from "@/components/college/profile-form";

export const metadata: Metadata = { title: "College Profile" };

export default async function CollegeProfilePage() {
  const user = await requireRole(["COLLEGE_ADMIN", "SUPER_ADMIN"]);

  const college = await prisma.college.findFirst({
    where: { admin: { supabaseId: user.supabaseId } },
    select: {
      id: true,
      name: true,
      website: true,
      officialEmail: true,
      contactPhone: true,
      contactPersonName: true,
      contactPersonDesig: true,
      contactPersonPhone: true,
      address: true,
      city: true,
      state: true,
      country: true,
      pincode: true,
      description: true,
      establishedYear: true,
      universityId: true,
      status: true,
    },
  });

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">College Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your institution&apos;s public profile</p>
      </div>
      <CollegeProfileForm college={college} />
    </div>
  );
}
