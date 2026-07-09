import type { Metadata } from "next";
import Link from "next/link";
import { Clock, CheckCircle, Mail, GraduationCap } from "lucide-react";

export const metadata: Metadata = { title: "Registration Pending — Sugg Platform" };
export const dynamic = "force-dynamic";

export default function CollegePendingPage() {
  const steps = [
    { icon: CheckCircle, label: "Registration Submitted", done: true },
    { icon: CheckCircle, label: "Email Verified", done: true },
    { icon: Clock, label: "Admin Review", done: false },
    { icon: Mail, label: "Welcome Email Sent", done: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground mb-6">
          <GraduationCap className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Under Review</h1>
        <p className="text-gray-500 text-sm mb-8">
          Your institution has been registered. Our team will review and approve your account within <strong>24–48 hours</strong>.
        </p>

        {/* Steps */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="space-y-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step.done ? "bg-green-100" : "bg-gray-100"}`}>
                    <Icon className={`w-4 h-4 ${step.done ? "text-green-600" : "text-gray-400"}`} />
                  </div>
                  <span className={`text-sm font-medium ${step.done ? "text-gray-900" : "text-gray-400"}`}>{step.label}</span>
                  {step.done && <span className="ml-auto text-xs text-green-600 font-medium">Done</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 mb-6">
          <strong>What happens next?</strong><br />
          Once approved, you will receive a welcome email with your login credentials and platform access.
        </div>

        <Link href="/login" className="text-sm text-primary font-medium hover:underline">
          Already approved? Sign In →
        </Link>
      </div>
    </div>
  );
}
