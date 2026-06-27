import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BarChart3, FileText, BookOpen, DollarSign } from "lucide-react";

export const metadata: Metadata = { title: "Analytics" };

export default async function CollegeAnalyticsPage() {
  const user = await requireRole(["COLLEGE_ADMIN"]);

  const college = await prisma.college.findFirst({
    where: { users: { some: { supabaseId: user.supabaseId } } },
    include: { _count: { select: { courses: true, applications: true, commissions: true } } },
  });

  const cards = [
    { label: "Courses", value: college?._count.courses ?? 0, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Applications", value: college?._count.applications ?? 0, icon: FileText, color: "text-green-600", bg: "bg-green-50" },
    { label: "Commissions", value: college?._count.commissions ?? 0, icon: DollarSign, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">{college?.name ?? ""} overview</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-lg border bg-card p-4">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
