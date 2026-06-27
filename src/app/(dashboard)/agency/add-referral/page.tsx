import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Add Referral" };

export default async function AddReferralPage() {
  await requireRole(["AGENCY_COUNSELOR", "AGENCY_ADMIN"]);

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Add Referral</h1>
        <p className="text-muted-foreground text-sm mt-1">Refer a new student to Sugg</p>
      </div>
      <div className="rounded-lg border border-dashed bg-muted/30 p-12 text-center text-muted-foreground">
        <p className="font-medium">Referral form coming soon</p>
        <p className="text-sm mt-1">Contact your agency admin to add referrals</p>
      </div>
    </div>
  );
}
