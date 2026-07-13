import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createStudentAndLead } from "@/actions/leads";
import { LeadCaptureForm } from "@/components/leads/lead-capture-form";

export const metadata: Metadata = { title: "Add Lead" };

export default async function NewCounselorLeadPage() {
  await requireRole(["SUGG_COUNSELOR", "AGENCY_COUNSELOR", "AGENCY_ADMIN", "SUPER_ADMIN"]);
  return (
    <div className="p-6">
      <LeadCaptureForm action={createStudentAndLead} redirectTo="/counselor/leads" />
    </div>
  );
}
