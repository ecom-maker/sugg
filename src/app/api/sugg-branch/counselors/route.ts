import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getSuggBranchScope } from "@/lib/sugg-branch-scope";
import { z } from "zod";

const createSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  specializations: z.array(z.string()).optional(),
  maxLeads: z.coerce.number().int().min(1).max(500).optional(),
});

/**
 * GET /api/sugg-branch/counselors
 * Sugg-internal counselors assigned to the manager's branch, with lead metrics.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role !== "SUGG_BRANCH_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = await getSuggBranchScope(user);
  if (!scope) {
    return NextResponse.json({ error: "No Sugg Branch assigned to this manager" }, { status: 404 });
  }

  const counselors = await prisma.counselor.findMany({
    where: { suggBranchId: scope.suggBranchId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          isActive: true,
          _count: {
            select: {
              assignedLeads: { where: { status: { notIn: ["ADMISSION_CONFIRMED", "LOST"] } } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ counselors });
}

/**
 * POST /api/sugg-branch/counselors
 * Create a Sugg-internal counselor bound to the manager's branch.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUGG_BRANCH_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = await getSuggBranchScope(user);
  if (!scope) {
    return NextResponse.json({ error: "No Sugg Branch assigned to this manager" }, { status: 404 });
  }

  try {
    const data = createSchema.parse(await request.json());

    const existing = await prisma.user.findFirst({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    // Provision a Supabase auth user (service role). Fall back to a pending id
    // if provisioning is unavailable, mirroring the college-registration flow.
    let supabaseId: string;
    try {
      const supabase = await createAdminClient();
      const { data: authData } = await supabase.auth.admin.createUser({
        email: data.email,
        phone: data.phone,
        email_confirm: true,
        user_metadata: { role: "SUGG_COUNSELOR", full_name: data.fullName },
      });
      supabaseId =
        authData?.user?.id ?? `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    } catch {
      supabaseId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    const counselor = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          supabaseId,
          email: data.email,
          phone: data.phone || null,
          fullName: data.fullName,
          role: "SUGG_COUNSELOR",
          isActive: true,
        },
      });

      const createdCounselor = await tx.counselor.create({
        data: {
          userId: createdUser.id,
          suggBranchId: scope.suggBranchId,
          specializations: data.specializations ?? [],
          maxLeads: data.maxLeads ?? 50,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE_SUGG_COUNSELOR",
          resource: "counselor",
          resourceId: createdCounselor.id,
          newValue: { fullName: data.fullName, suggBranchId: scope.suggBranchId },
        },
      });

      return createdCounselor;
    });

    return NextResponse.json({ counselor }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[POST sugg-branch/counselors]", err);
    return NextResponse.json({ error: "Failed to create counselor" }, { status: 500 });
  }
}
