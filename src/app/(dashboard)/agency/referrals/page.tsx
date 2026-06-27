import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";

export const metadata: Metadata = { title: "Referrals" };

export default async function AgencyReferralsPage() {
  const user = await requireRole(["AGENCY_ADMIN", "AGENCY_COUNSELOR"]);

  const agency = await prisma.agency.findFirst({
    where: { admin: { supabaseId: user.supabaseId } },
  });

  const referrals = agency
    ? await prisma.studentReferral.findMany({
        where: { agencyId: agency.id },
        orderBy: { createdAt: "desc" },
        include: {
          student: { select: { name: true, interestedCourse: true, preferredCollege: true } },
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
                <p className="font-medium">{r.student.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {r.student.preferredCollege ?? "No college preference"} · {r.student.interestedCourse ?? "No course preference"}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
