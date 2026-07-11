import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getSuggBranchScope, isAgencyInScope } from "@/lib/sugg-branch-scope";
import { NotificationMessages } from "@/lib/notifications";
import type { NotificationType } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  recommendation: z.enum(["approve", "reject", "suspend"]),
  note: z.string().max(1000).optional(),
});

/**
 * POST /api/sugg-branch/agencies/[id]/recommend
 * The Sugg Branch Manager RECOMMENDS (does not execute) approval, rejection, or
 * suspension of an agency in their territory. The Super Admin retains the final
 * decision — this only records the recommendation and notifies Super Admins.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUGG_BRANCH_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const scope = await getSuggBranchScope(user);
  if (!scope) {
    return NextResponse.json({ error: "No Sugg Branch assigned to this manager" }, { status: 404 });
  }

  // Territory guard: managers can only act on agencies they cover.
  if (!(await isAgencyInScope(scope.suggBranchId, id))) {
    return NextResponse.json({ error: "Agency is not in your territory" }, { status: 403 });
  }

  try {
    const { recommendation, note } = schema.parse(await request.json());

    const agency = await prisma.agency.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

    // Prefix the stored note with the recommendation direction so the Super
    // Admin queue can display it without a separate column.
    const storedNote = `[${recommendation.toUpperCase()}]${note ? ` ${note}` : ""}`;

    await prisma.$transaction(async (tx) => {
      // Record recommendation metadata WITHOUT changing approvalStatus — the
      // final approve/reject/suspend action belongs to the Super Admin.
      await tx.agency.update({
        where: { id },
        data: {
          recommendationNote: storedNote,
          recommendedById: user.id,
          recommendedAt: new Date(),
        },
      });

      const isSuspend = recommendation === "suspend";
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: isSuspend
            ? "RECOMMEND_AGENCY_SUSPENSION"
            : "RECOMMEND_AGENCY_DECISION",
          resource: "agency",
          resourceId: id,
          newValue: { recommendation, note: note ?? null, suggBranchId: scope.suggBranchId },
        },
      });

      // Notify Super Admins.
      const admins = await tx.user.findMany({
        where: { role: "SUPER_ADMIN", isActive: true },
        select: { id: true },
      });
      if (admins.length) {
        const msg = isSuspend
          ? NotificationMessages.agencySuspensionRecommended(agency.name, note ?? "—")
          : NotificationMessages.agencyRecommendationSubmitted(agency.name, recommendation);
        const notifType: NotificationType = isSuspend
          ? "AGENCY_SUSPENSION_RECOMMENDED"
          : "AGENCY_RECOMMENDATION_SUBMITTED";
        await tx.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            type: notifType,
            title: msg.title,
            message: msg.message,
            resourceId: id,
          })),
        });
      }
    });

    return NextResponse.json({ success: true, recommendation });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[POST recommend]", err);
    return NextResponse.json({ error: "Failed to submit recommendation" }, { status: 500 });
  }
}
