import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { resolveSuggBranch } from "@/lib/sugg-territory";
import { NotificationMessages } from "@/lib/notifications";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  website: z.string().url().optional().or(z.literal("")),
  registrationNumber: z.string().max(120).optional(),
  ownerName: z.string().max(200).optional(),
  ownerMobile: z.string().max(40).optional(),
  nationalIdType: z.string().max(60).optional(),
  nationalIdNumber: z.string().max(120).optional(),
  headquarters: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(120).optional(),
  countryId: z.string().optional().nullable(),
  stateId: z.string().optional().nullable(),
  districtId: z.string().optional().nullable(),
});

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

    // Ensure unique slug.
    const base = slugify(data.name);
    let slug = base;
    let n = 1;
    while (await prisma.agency.findFirst({ where: { slug }, select: { id: true } })) {
      slug = `${base}-${n++}`;
    }

    // Resolve covering Sugg Branch by geography.
    const covering = await resolveSuggBranch({
      countryId: data.countryId,
      stateId: data.stateId,
      districtId: data.districtId,
    });

    const agency = await prisma.$transaction(async (tx) => {
      const created = await tx.agency.create({
        data: {
          name: data.name,
          slug,
          email: data.email,
          phone: data.phone || null,
          website: data.website || null,
          registrationNumber: data.registrationNumber || null,
          ownerName: data.ownerName || null,
          ownerMobile: data.ownerMobile || null,
          nationalIdType: data.nationalIdType || null,
          nationalIdNumber: data.nationalIdNumber || null,
          headquarters: data.headquarters || null,
          address: data.address || null,
          city: data.city || null,
          countryId: data.countryId || null,
          stateId: data.stateId || null,
          districtId: data.districtId || null,
          suggBranchId: covering?.id ?? null,
          approvalStatus: "PENDING",
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE_AGENCY",
          resource: "agency",
          resourceId: created.id,
          newValue: { name: created.name, suggBranchId: covering?.id ?? null },
        },
      });

      // Route notification.
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
