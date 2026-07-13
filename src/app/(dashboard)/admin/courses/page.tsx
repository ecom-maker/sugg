import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CatalogManager } from "@/components/admin/catalog-manager";

export const metadata: Metadata = { title: "Course Catalog" };

// The master course catalog — standardised course names used across the
// platform (lead capture, college course picker). Not college offerings/fees.
export default async function AdminCoursesPage() {
  await requireRole(["SUPER_ADMIN"]);

  const courses = await prisma.courseCatalog.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, degreeType: true, field: true, duration: true },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Course Catalog</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Standard course list used across the platform. Add new courses to keep naming consistent.
        </p>
      </div>
      <CatalogManager initial={courses} />
    </div>
  );
}
