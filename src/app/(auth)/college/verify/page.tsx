import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { CollegeVerifyForm } from "@/components/college/verify-form";

export const metadata: Metadata = { title: "Verify Email — Sugg Platform" };
export const dynamic = "force-dynamic";

export default async function CollegeVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; collegeId?: string }>;
}) {
  const params = await searchParams;
  const email = params.email ?? "";
  const collegeId = params.collegeId ?? "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground mb-4">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Your Email</h1>
          <p className="text-gray-500 text-sm mt-2">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <CollegeVerifyForm email={email} collegeId={collegeId} />
        </div>
      </div>
    </div>
  );
}
