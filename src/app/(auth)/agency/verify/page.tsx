import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { AgencyVerifyForm } from "@/components/agency/verify-form";

export const metadata: Metadata = { title: "Verify — Sugg Platform" };
export const dynamic = "force-dynamic";

export default async function AgencyVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ agencyId?: string; email?: string }>;
}) {
  const params = await searchParams;
  const agencyId = params.agencyId ?? "";
  const email = params.email ?? "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground mb-4">
            <Briefcase className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Your Account</h1>
          <p className="text-gray-500 text-sm mt-2">
            {email ? (
              <>We sent a 6-digit code to <strong>{email}</strong></>
            ) : (
              "Enter the 6-digit code sent to the owner."
            )}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <AgencyVerifyForm agencyId={agencyId} />
        </div>
      </div>
    </div>
  );
}
