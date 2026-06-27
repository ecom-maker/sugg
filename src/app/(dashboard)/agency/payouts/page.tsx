import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Payouts" };

export default async function AgencyPayoutsPage() {
  await requireRole(["AGENCY_ADMIN"]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payouts</h1>
        <p className="text-muted-foreground text-sm mt-1">Your payout history</p>
      </div>
      <div className="text-center py-16 text-muted-foreground border rounded-lg">
        <p className="font-medium">No payouts processed yet</p>
        <p className="text-sm mt-1">Approved commissions will appear here once processed by Sugg admin</p>
      </div>
    </div>
  );
}
