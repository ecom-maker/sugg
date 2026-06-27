import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";
import { GraduationCap } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Sugg account",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white" />
          <div className="absolute bottom-32 right-10 w-96 h-96 rounded-full bg-white" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full bg-white" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-blue-900" />
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">Sugg</span>
          </div>
          <p className="text-blue-200 text-sm">Admission Management Platform</p>
        </div>

        <div className="relative z-10">
          <blockquote className="text-white">
            <p className="text-2xl font-light leading-relaxed mb-6">
              "Streamlining admissions from WhatsApp inquiry to enrolled student — all in one platform."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-white font-semibold text-sm">
                SA
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Sugg Admin</p>
                <p className="text-blue-300 text-xs">Admission Management Platform</p>
              </div>
            </div>
          </blockquote>
        </div>

        <div className="relative z-10">
          <div className="grid grid-cols-3 gap-6">
            {[
              { value: "500+", label: "Colleges" },
              { value: "50K+", label: "Students" },
              { value: "₹2Cr+", label: "Commission Paid" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-white text-2xl font-bold">{stat.value}</p>
                <p className="text-blue-300 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Sugg</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <LoginForm />

          <p className="text-center text-xs text-muted-foreground mt-8">
            By continuing, you agree to our{" "}
            <a href="#" className="text-primary hover:underline">Terms of Service</a>{" "}
            and{" "}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
