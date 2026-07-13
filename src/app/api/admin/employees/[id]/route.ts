import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getEmployeeScope, scopeCanManage } from "@/lib/employee-scope";
import { EMPLOYEE_TYPE_LABELS } from "@/lib/hr";
import { employeeFields } from "../route";
import { z } from "zod";

const updateSchema = z.object(employeeFields);

/** PUT /api/admin/employees/[id] — update, scoped to the caller's branch/role. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = await getEmployeeScope(user);
  if (!scope) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  // May the caller manage this employee at all?
  if (!scopeCanManage(scope, existing.branchId, existing.employeeType)) {
    return NextResponse.json({ error: "You cannot manage this employee" }, { status: 403 });
  }

  try {
    const data = updateSchema.parse(await request.json());

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

    // Branch: Super Admin may reassign (validated); Branch Manager cannot move
    // an employee out of their branch.
    let branchId: string | null = existing.branchId;
    if (scope.isSuperAdmin) {
      branchId = data.branchId ?? null;
      if (branchId) {
        const branch = await prisma.agencyBranch.findUnique({ where: { id: branchId }, select: { id: true } });
        if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 400 });
      }
    } else {
      branchId = scope.branchId;
    }

    const employee = await prisma.employee.update({
      where: { id },
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
        branchId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_EMPLOYEE",
        resource: "employee",
        resourceId: employee.id,
        newValue: {
          name: `${employee.firstName} ${employee.lastName}`,
          employeeType: employee.employeeType,
          branchId: employee.branchId,
        },
      },
    });

    return NextResponse.json({ employee });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[PUT /api/admin/employees/[id]]", err);
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}
