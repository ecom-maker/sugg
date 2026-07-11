import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SuggBranchForm } from "@/components/sugg-branches/sugg-branch-form";

export const metadata: Metadata = { title: "New Sugg Branch" };

export default async function NewSuggBranchPage() {
  await requireRole(["SUPER_ADMIN"]);

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
        <Link href="/admin/sugg-branches">
          <ArrowLeft className="w-4 h-4" /> Back to Sugg Branches
        </Link>
      </Button>
      <SuggBranchForm />
    </div>
  );
}
