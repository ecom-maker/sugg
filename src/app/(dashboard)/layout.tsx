import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getAgencyApprovalState, isAgencyBlocked } from "@/lib/agency-access";
import { DashboardLayout } from "@/components/dashboard/layout";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  // Block agency-role users whose agency is not APPROVED (PENDING/REJECTED/
  // SUSPENDED/ARCHIVED). PENDING owners are already blocked by isActive.
  const agencyState = await getAgencyApprovalState(user);
  if (isAgencyBlocked(agencyState)) {
    redirect(`/agency-blocked?status=${agencyState!.status}`);
  }

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}
