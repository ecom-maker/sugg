import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";

export const metadata: Metadata = { title: "My Referrals" };

export default async function MyReferralsPage() {
  const user = await requireRole(["AGENCY_COUNSELOR", "AGENCY_ADMIN"]);

  const referrals = await prisma.agencyReferral.findMany({
    where: { referredBy: { supabaseId: user.supabaseId } },
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { fullName: true, email: true } },
      college: { select: { name: true } },
      course: { select: { name: true } },
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Referrals</h1>
        <p className="text-muted-foreground text-sm mt-1">{referrals.length} students referred by you</p>
      </div>

      <div className="space-y-2">
        {referrals.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-lg">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            You haven&apos;t referred any students yet
          </div>
        ) : (
          referrals.map((r) => (
            <div key={r.id} className="rounded-lg border bg-card p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{r.student.fullName}</p>
                <p className="text-sm text-muted-foreground">{r.college?.name ?? "No college"} · {r.course?.name ?? "No course"}</p>
              </div>
              <div className="text-right">
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{r.status}</span>
                <p className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleDateString("en-IN")}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
