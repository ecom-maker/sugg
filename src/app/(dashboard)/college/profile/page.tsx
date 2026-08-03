import type { Metadata } from "next";
import { FileText, ExternalLink, CheckCircle2 } from "lucide-react";
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
      termsAcceptedAt: true,
    },
  });

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">College Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your institution&apos;s public profile</p>
      </div>
      <CollegeProfileForm college={college} />

      {/* Terms & Conditions */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Terms &amp; Conditions</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          The terms governing your college profile activation and use of the Sugg platform.
        </p>
        {college?.termsAcceptedAt ? (
          <p className="inline-flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            Accepted on {new Date(college.termsAcceptedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        ) : (
          <p className="text-sm text-amber-600">Not yet accepted.</p>
        )}
        <a
          href="/college-terms"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ExternalLink className="w-4 h-4" /> View Terms &amp; Conditions
        </a>
      </div>
    </div>
  );
}
