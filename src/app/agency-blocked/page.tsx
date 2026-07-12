import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { getAgencyApprovalState } from "@/lib/agency-access";
import { SignOutButton } from "@/components/agency/sign-out-button";
import { Clock, XCircle, PauseCircle, Archive } from "lucide-react";

export const metadata: Metadata = { title: "Access restricted" };

// Lives OUTSIDE the (dashboard) route group so the approval gate that redirects
// here does not loop.
export default async function AgencyBlockedPage() {
  const user = await requireAuth();
  const state = await getAgencyApprovalState(user);
  const status = state?.status ?? "PENDING";
  const reason = state?.reason;

  const config: Record<string, { icon: typeof Clock; title: string; message: string; color: string }> = {
    PENDING: {
      icon: Clock,
      title: "Awaiting approval",
      message: "Your agency registration is verified and awaiting Super Admin approval. You'll be able to log in once it's approved.",
      color: "text-amber-600 bg-amber-50",
    },
    REJECTED: {
      icon: XCircle,
      title: "Registration not approved",
      message: `Your agency registration was not approved.${reason ? ` Reason: ${reason}` : ""} Please contact the platform administrator.`,
      color: "text-red-600 bg-red-50",
    },
    SUSPENDED: {
      icon: PauseCircle,
      title: "Agency suspended",
      message: "Your agency has been suspended. Please contact the platform administrator to restore access.",
      color: "text-orange-600 bg-orange-50",
    },
    ARCHIVED: {
      icon: Archive,
      title: "Agency archived",
      message: "Your agency has been archived and can no longer be accessed.",
      color: "text-gray-600 bg-gray-100",
    },
  };

  const c = config[status] ?? config.PENDING;
  const Icon = c.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm space-y-5">
        <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${c.color}`}>
          <Icon className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{c.title}</h1>
          <p className="text-sm text-muted-foreground mt-2">{c.message}</p>
        </div>
        <div className="pt-2">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
