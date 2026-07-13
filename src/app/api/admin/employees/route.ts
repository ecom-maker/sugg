import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getEmployeeScope } from "@/lib/employee-scope";
import { nextEmployeeCode } from "@/lib/employee-code";
import { EMPLOYEE_TYPE_LABELS } from "@/lib/hr";
import { z } from "zod";

const employeeTypes = [
  "SUPER_ADMIN",
  "BRANCH_MANAGER",
  "ASST_BRANCH_MANAGER",
  "TEAM_LEADER",
  "COUNSELLOR",
  "OFFICE_ASSISTANT",
  "DRIVER",
] as const;

const idTypes = ["AADHAAR", "PASSPORT", "DRIVING_LICENSE", "PAN", "VOTERS_ID"] as const;

const emptyToNull = (v: unknown) => (v === "" ? null : v);

/** Field validators shared by create and update. */
export const employeeFields = {
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
  branchId: z.preprocess(emptyToNull, z.string().nullable().optional()),
};

const createSchema = z.object(employeeFields);

/** GET /api/admin/employees?q= — Super Admin (all) or Branch Manager (own branch). */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = await getEmployeeScope(user);
  if (!scope) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const where: Prisma.EmployeeWhereInput = {
    ...scope.where,
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { officialEmail: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const employees = await prisma.employee.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json({ employees });
}

/** POST /api/admin/employees — create, scoped to the caller's branch/role. */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = await getEmployeeScope(user);
  if (!scope) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    // A user can only assign employee types within their scope.
    if (!scope.assignableTypes.includes(data.employeeType)) {
      return NextResponse.json(
        {
          error: `You can only assign: ${scope.assignableTypes
            .map((t) => EMPLOYEE_TYPE_LABELS[t])
            .join(", ")}`,
        },
        { status: 403 }
      );
    }

    // Branch Manager: force their own branch. Super Admin: optional, validated.
    let branchId: string | null;
    if (scope.isSuperAdmin) {
      branchId = data.branchId ?? null;
      if (branchId) {
        const branch = await prisma.agencyBranch.findUnique({ where: { id: branchId }, select: { id: true } });
        if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 400 });
      }
    } else {
      branchId = scope.branchId;
    }

    const baseData = {
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
      branchId,
    };

    // The employee code is system-generated. Retry on the rare event that a
    // concurrent create claimed the same sequence (unique constraint).
    let employee: Awaited<ReturnType<typeof prisma.employee.create>> | null = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const employeeCode = await nextEmployeeCode(attempt);
      try {
        employee = await prisma.employee.create({ data: { ...baseData, employeeCode } });
        break;
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt < 5) {
          continue;
        }
        throw e;
      }
    }
    if (!employee) {
      return NextResponse.json({ error: "Could not allocate an employee code" }, { status: 500 });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_EMPLOYEE",
        resource: "employee",
        resourceId: employee.id,
        newValue: {
          employeeCode: employee.employeeCode,
          name: `${employee.firstName} ${employee.lastName}`,
          employeeType: employee.employeeType,
          branchId: employee.branchId,
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
