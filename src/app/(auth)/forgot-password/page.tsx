import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot Password — Sugg Platform" };
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground mb-4">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot your password?</h1>
          <p className="text-gray-500 text-sm mt-2">
            Enter your email and we&apos;ll send you a link to reset it.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <ForgotPasswordForm />
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/login" className="text-primary font-medium hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
