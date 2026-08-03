import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getAgencyApprovalState, isAgencyBlocked } from "@/lib/agency-access";
import { DashboardLayout } from "@/components/dashboard/layout";
import { CollegeTermsGate } from "@/components/college/terms-gate";
import { prisma } from "@/lib/prisma";

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

  // College accounts must accept the Terms & Conditions once. Until they do,
  // a blocking acceptance popup is shown on every page.
  let termsGate: React.ReactNode = null;
  if (user.role === "COLLEGE_ADMIN") {
    const college = await prisma.college.findFirst({
      where: { admin: { supabaseId: user.supabaseId } },
      select: { name: true, termsAcceptedAt: true },
    });
    if (college && !college.termsAcceptedAt) {
      termsGate = <CollegeTermsGate collegeName={college.name} />;
    }
  }

  return (
    <DashboardLayout user={user}>
      {children}
      {termsGate}
    </DashboardLayout>
  );
}
