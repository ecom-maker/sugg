import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { CollegeNewForm } from "@/components/dashboard/admin/college-new-form";

export const metadata: Metadata = { title: "Add New College" };

export default async function AdminCollegesNewPage() {
  await requireRole(["SUPER_ADMIN"]);

  return <CollegeNewForm />;
}
