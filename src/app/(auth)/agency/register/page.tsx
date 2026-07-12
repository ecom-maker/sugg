import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { AgencyRegisterForm } from "@/components/agency/register-form";

export const metadata: Metadata = { title: "Agency Registration — Sugg Platform" };
export const dynamic = "force-dynamic";

export default function AgencyRegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground mb-4">
            <Briefcase className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Register Your Agency</h1>
          <p className="text-gray-500 text-sm mt-2">
            Join Sugg as a partner agency and start referring students.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <AgencyRegisterForm />
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
