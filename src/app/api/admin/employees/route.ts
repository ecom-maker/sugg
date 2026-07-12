import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";

const employeeTypes = [
  "BRANCH_MANAGER",
  "ASST_BRANCH_MANAGER",
  "TEAM_LEADER",
  "COUNSELLOR",
  "OFFICE_ASSISTANT",
  "DRIVER",
] as const;

const idTypes = ["AADHAAR", "PASSPORT", "DRIVING_LICENSE", "PAN", "VOTERS_ID"] as const;

const emptyToNull = (v: unknown) => (v === "" ? null : v);

const createSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(120),
  lastName: z.string().min(1, "Last name is required").max(120),
  dob: z.preprocess(emptyToNull, z.string().date().nullable().optional()),
  address: z.preprocess(emptyToNull, z.string().max(500).nullable().optional()),
  personalPhone: z.preprocess(emptyToNull, z.string().max(40).nullable().optional()),
  officialPhone: z.preprocess(emptyToNull, z.string().max(40).nullable().optional()),
  personalEmail: z.preprocess(emptyToNull, z.string().email().nullable().optional()),
  officialEmail: z.preprocess(emptyToNull, z.string().email().nullable().optional()),
  emergencyName: z.preprocess(emptyToNull, z.string().max(120).nullable().optional()),
  emergencyRelation: z.preprocess(emptyToNull, z.string().max(60).nullable().optional()),
  emergencyPhone: z.preprocess(emptyToNull, z.string().max(40).nullable().optional()),
  nationalIdType: z.preprocess(emptyToNull, z.enum(idTypes).nullable().optional()),
  nationalIdNumber: z.preprocess(emptyToNull, z.string().max(60).nullable().optional()),
  employeeType: z.enum(employeeTypes, { required_error: "Employee type is required" }),
});

/** GET /api/admin/employees?q= — Super Admin only. */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const where = q
    ? {
        OR: [
          { firstName: { contains: q, mode: "insensitive" as const } },
          { lastName: { contains: q, mode: "insensitive" as const } },
          { officialEmail: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const employees = await prisma.employee.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json({ employees });
}

/** POST /api/admin/employees — Super Admin only. Creates an employee. */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const employee = await prisma.employee.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        dob: data.dob ? new Date(data.dob) : null,
        address: data.address ?? null,
        personalPhone: data.personalPhone ?? null,
        officialPhone: data.officialPhone ?? null,
        personalEmail: data.personalEmail ?? null,
        officialEmail: data.officialEmail ?? null,
        emergencyName: data.emergencyName ?? null,
        emergencyRelation: data.emergencyRelation ?? null,
        emergencyPhone: data.emergencyPhone ?? null,
        nationalIdType: data.nationalIdType ?? null,
        nationalIdNumber: data.nationalIdNumber ?? null,
        employeeType: data.employeeType,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_EMPLOYEE",
        resource: "employee",
        resourceId: employee.id,
        newValue: {
          name: `${employee.firstName} ${employee.lastName}`,
          employeeType: employee.employeeType,
        },
      },
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[POST /api/admin/employees]", err);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}
