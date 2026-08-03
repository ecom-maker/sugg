import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { AgencyTermsContent } from "@/components/agency/terms-content";

export const metadata: Metadata = {
  title: "Agency Terms & Conditions | Sugg",
  description:
    "Terms and Conditions for Agencies and Admission Counselors using the Sugg admission management platform.",
};

export default function AgencyTermsPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <a
            href="/legal/Sugg_Agency_Terms_and_Conditions.docx"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <FileText className="w-4 h-4" /> Download (.docx)
          </a>
        </div>
        <div className="rounded-xl border bg-card p-6 sm:p-8 shadow-sm">
          <AgencyTermsContent />
        </div>
      </div>
    </div>
  );
}
