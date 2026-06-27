import { requireAuth } from "@/lib/auth";
import { getRoleRedirectPath } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardRedirect() {
  const user = await requireAuth();
  redirect(getRoleRedirectPath(user.role));
}
