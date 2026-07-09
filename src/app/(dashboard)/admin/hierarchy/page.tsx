import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { HierarchyView } from "@/components/hierarchy/hierarchy-view";
import { Button } from "@/components/ui/button";
import { GitBranch, BarChart3 } from "lucide-react";

export const metadata: Metadata = { title: "Organizational Hierarchy" };

export default async function HierarchyPage() {
  await requireRole(["SUPER_ADMIN", "AGENCY_OWNER", "AGENCY_ADMIN", "BRANCH_MANAGER"]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="w-6 h-6" />
            Organizational Hierarchy
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Country → State → District → Branch → Team → Counselor
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="gap-2">
            <Link href="/admin/hierarchy/compare">
              <BarChart3 className="w-4 h-4" />
              Compare Geography
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/admin/hierarchy/teams/compare">
              <BarChart3 className="w-4 h-4" />
              Compare Teams
            </Link>
          </Button>
        </div>
      </div>

      <HierarchyView />
    </div>
  );
}
