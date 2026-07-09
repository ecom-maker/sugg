import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { UniversityForm } from "@/components/university/university-form";

export const metadata: Metadata = { title: "Create University" };

export default async function NewUniversityPage() {
  await requireRole(["SUPER_ADMIN"]);

  return (
    <div className="p-6">
      <UniversityForm />
    </div>
  );
}
