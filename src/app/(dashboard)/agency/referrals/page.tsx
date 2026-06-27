import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";

export const metadata: Metadata = { title: "Referrals" };

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ENROLLED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  PROCESSING: "bg-blue-100 text-blue-700",
};

export default async function AgencyReferralsPage() {
  const user = await requireRole(["AGENCY_ADMIN", "AGENCY_COUNSELOR"]);

  const agency = await prisma.agency.findFirst({
    where: { users: { some: { supabaseId: user.supabaseId } } },
  });

  const referrals = agency
    ? await prisma.agencyReferral.findMany({
        where: { agencyId: agency.id },
        orderBy: { createdAt: "desc" },
        include: {
          student: { select: { fullName: true } },
          college: { select: { name: true } },
          course: { select: { name: true } },
        },
      })
    : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referrals</h1>
        <p className="text-muted-foreground text-sm mt-1">{referrals.length} total referrals</p>
      </div>

      <div className="space-y-2">
        {referrals.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-lg">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No referrals yet
          </div>
        ) : (
          referrals.map((r) => (
            <div key={r.id} className="rounded-lg border bg-card p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{r.student.fullName}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600"}`}>{r.status}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{r.college?.name ?? "No college"} · {r.course?.name ?? "No course"}</p>
              </div>
              <span className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
