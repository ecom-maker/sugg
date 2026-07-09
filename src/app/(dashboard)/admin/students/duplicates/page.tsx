import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { DuplicateMergeView } from "@/components/students/duplicate-merge-view";

export const metadata: Metadata = { title: "Duplicate Students" };

export default async function DuplicatesPage() {
  await requireRole(["SUPER_ADMIN"]);

  return (
    <div className="p-6">
      <DuplicateMergeView />
    </div>
  );
}
