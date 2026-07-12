import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { resolveSuggBranch } from "@/lib/sugg-territory";
import { NotificationMessages } from "@/lib/notifications";
import { ensureHeadOfficeBranch } from "@/lib/agency-onboarding";
import { normalizeMobileE164 } from "@/lib/mobile-normalize";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const specialization = z.enum([
  "DOMESTIC_ADMISSIONS",
  "STUDY_ABROAD",
  "MEDICAL",
  "ENGINEERING",
  "MANAGEMENT",
  "OTHER",
]);

const createSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  website: z.string().url().optional().or(z.literal("")),
  registrationNumber: z.string().max(120).optional(),
  ownerName: z.string().max(200).optional(),
  ownerMobile: z.string().max(40).optional(),
  ownerEmail: z.string().email().optional().or(z.literal("")),
  managerName: z.string().max(200).optional(),
  managerPhone: z.string().max(40).optional(),
  managerEmail: z.string().email().optional().or(z.literal("")),
  nationalIdType: z.string().max(60).optional(),
  nationalIdNumber: z.string().max(120).optional(),
  yearEstablished: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional(),
  counselorCountEstimate: z.coerce.number().int().min(0).max(100000).optional(),
  specialization: z.array(specialization).optional().default([]),
  headquarters: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(120).optional(),
  countryId: z.string().optional().nullable(),
  stateId: z.string().optional().nullable(),
  districtId: z.string().optional().nullable(),
});

async function provisionUser(email: string, phone: string, fullName: string, role: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    phone: phone ? (phone.startsWith("+") ? phone : `+${phone}`) : undefined,
    email_confirm: false,
    user_metadata: { role, full_name: fullName },
  });
  return error || !data.user
    ? `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`
    : data.user.id;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * GET /api/admin/agencies
 * Query: q, status (approvalStatus), suggBranchId, unassigned=true, page, limit
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const suggBranchId = searchParams.get("suggBranchId") ?? "";
  const unassigned = searchParams.get("unassigned") === "true";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? "20"));

  const where: Record<string, unknown> = {};
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (status) where.approvalStatus = status;
  if (unassigned) where.suggBranchId = null;
  else if (suggBranchId) where.suggBranchId = suggBranchId;

  const [total, agencies] = await Promise.all([
    prisma.agency.count({ where: where as never }),
    prisma.agency.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        suggBranch: { select: { id: true, branchName: true } },
        geoState: { select: { stateName: true } },
        geoCountry: { select: { countryName: true } },
        _count: { select: { branches: true, agencyUsers: true } },
      },
    }),
  ]);

  return NextResponse.json({
    agencies,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * POST /api/admin/agencies
 * Super Admin creates an agency. The covering Sugg Branch is resolved from the
 * supplied geography (district → state → country). If matched, the Sugg Branch
 * Manager is notified; if not, Super Admins get an unassigned-territory alert.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const existing = await prisma.agency.findFirst({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "An agency with this email already exists" }, { status: 409 });
    }

    const hasManager = Boolean(data.managerEmail && data.managerName);
    const loginEmails = [
      ...(data.ownerEmail ? [data.ownerEmail] : []),
      ...(hasManager ? [data.managerEmail!] : []),
    ];
    if (loginEmails.length) {
      const dupeUser = await prisma.user.findFirst({
        where: { email: { in: loginEmails } },
        select: { email: true },
      });
      if (dupeUser) {
        return NextResponse.json(
          { error: `A user with the email ${dupeUser.email} already exists.` },
          { status: 409 }
        );
      }
    }

    // Ensure unique slug.
    const base = slugify(data.name);
    let slug = base;
    let n = 1;
    while (await prisma.agency.findFirst({ where: { slug }, select: { id: true } })) {
      slug = `${base}-${n++}`;
    }

    // Resolve covering Sugg Branch + geo names for the string columns.
    const [covering, countryRec, stateRec] = await Promise.all([
      resolveSuggBranch({ countryId: data.countryId, stateId: data.stateId, districtId: data.districtId }),
      data.countryId
        ? prisma.country.findUnique({ where: { id: data.countryId }, select: { countryName: true } })
        : Promise.resolve(null),
      data.stateId
        ? prisma.state.findUnique({ where: { id: data.stateId }, select: { stateName: true } })
        : Promise.resolve(null),
    ]);

    // Provision Supabase auth users (admin-created agencies are pre-approved).
    const ownerSupabaseId = data.ownerEmail
      ? await provisionUser(data.ownerEmail, data.ownerMobile ?? "", data.ownerName ?? data.name, "AGENCY_OWNER")
      : null;
    const managerSupabaseId = hasManager
      ? await provisionUser(data.managerEmail!, data.managerPhone ?? "", data.managerName!, "AGENCY_ADMIN")
      : null;

    const agency = await prisma.$transaction(async (tx) => {
      let ownerId: string | null = null;
      if (data.ownerEmail && ownerSupabaseId) {
        const owner = await tx.user.create({
          data: {
            supabaseId: ownerSupabaseId,
            email: data.ownerEmail,
            phone: data.ownerMobile ? `+${normalizeMobileE164(data.ownerMobile)}` : null,
            fullName: data.ownerName ?? data.name,
            role: "AGENCY_OWNER",
            isActive: true,
          },
        });
        ownerId = owner.id;
      }

      const created = await tx.agency.create({
        data: {
          ownerId,
          name: data.name,
          slug,
          email: data.email,
          phone: data.phone || null,
          website: data.website || null,
          registrationNumber: data.registrationNumber || null,
          ownerName: data.ownerName || null,
          ownerMobile: data.ownerMobile || null,
          ownerEmail: data.ownerEmail || null,
          managerName: hasManager ? data.managerName : null,
          managerPhone: hasManager ? data.managerPhone ?? null : null,
          managerEmail: hasManager ? data.managerEmail : null,
          nationalIdType: data.nationalIdType || null,
          nationalIdNumber: data.nationalIdNumber || null,
          yearEstablished: data.yearEstablished ?? null,
          counselorCountEstimate: data.counselorCountEstimate ?? null,
          specialization: data.specialization,
          headquarters: data.headquarters || null,
          address: data.address || null,
          city: data.city || null,
          state: stateRec?.stateName ?? null,
          country: countryRec?.countryName ?? null,
          countryId: data.countryId || null,
          stateId: data.stateId || null,
          districtId: data.districtId || null,
          suggBranchId: covering?.id ?? null,
          approvalStatus: "APPROVED",
          onboardingSource: "ADMIN_CREATED",
          isVerified: true,
          emailVerified: true,
          mobileVerified: true,
          approvedById: user.id,
          approvedAt: new Date(),
        },
      });

      if (ownerId) {
        await tx.agencyUser.create({
          data: { userId: ownerId, agencyId: created.id, branchId: null, status: "ACTIVE" },
        });
      }
      if (hasManager && managerSupabaseId) {
        const manager = await tx.user.create({
          data: {
            supabaseId: managerSupabaseId,
            email: data.managerEmail!,
            phone: data.managerPhone ? `+${normalizeMobileE164(data.managerPhone)}` : null,
            fullName: data.managerName!,
            role: "AGENCY_ADMIN",
            isActive: true,
          },
        });
        await tx.agencyUser.create({
          data: { userId: manager.id, agencyId: created.id, branchId: null, status: "ACTIVE" },
        });
      }

      // Default Head Office branch so the agency can operate immediately.
      await ensureHeadOfficeBranch(tx, {
        id: created.id,
        address: created.address,
        city: created.city,
        state: created.state,
        country: created.country,
        countryId: created.countryId,
        stateId: created.stateId,
        districtId: created.districtId,
        phone: created.phone,
        email: created.email,
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE_AGENCY",
          resource: "agency",
          resourceId: created.id,
          newValue: { name: created.name, onboardingSource: "ADMIN_CREATED", suggBranchId: covering?.id ?? null },
        },
      });

      // Welcome the owner (admin-created agencies are approved on creation).
      if (ownerId) {
        await tx.notification.create({
          data: {
            userId: ownerId,
            type: "AGENCY_APPROVED",
            title: "Welcome to Sugg",
            message: `${created.name} has been created and approved. Complete your login setup to get started.`,
            resourceId: created.id,
          },
        });
      }

      // Route territory notification.
      if (covering?.managerId) {
        const msg = NotificationMessages.newAgencyInTerritory(created.name);
        await tx.notification.create({
          data: {
            userId: covering.managerId,
            type: "NEW_AGENCY_IN_TERRITORY",
            title: msg.title,
            message: msg.message,
            resourceId: created.id,
          },
        });
      } else {
        const admins = await tx.user.findMany({
          where: { role: "SUPER_ADMIN", isActive: true },
          select: { id: true },
        });
        if (admins.length) {
          const msg = NotificationMessages.unassignedTerritoryAgency(created.name);
          await tx.notification.createMany({
            data: admins.map((a) => ({
              userId: a.id,
              type: "UNASSIGNED_TERRITORY_AGENCY" as const,
              title: msg.title,
              message: msg.message,
              resourceId: created.id,
            })),
          });
        }
      }

      return created;
    });

    return NextResponse.json(
      { agency, coveringSuggBranch: covering ?? null },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[POST /api/admin/agencies]", err);
    return NextResponse.json({ error: "Failed to create agency" }, { status: 500 });
  }
}
