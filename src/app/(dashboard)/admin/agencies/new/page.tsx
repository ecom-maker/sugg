import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AgencyForm } from "@/components/agencies/agency-form";

export const metadata: Metadata = { title: "New Agency" };

export default async function NewAgencyPage() {
  await requireRole(["SUPER_ADMIN"]);

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
        <Link href="/admin/agencies">
          <ArrowLeft className="w-4 h-4" /> Back to Agencies
        </Link>
      </Button>
      <AgencyForm />
    </div>
  );
}
