import { requireAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard/layout";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}
