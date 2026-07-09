import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function logStudentAction(
  userId: string | null,
  action: string,
  resourceId: string,
  oldValue?: Prisma.InputJsonValue,
  newValue?: Prisma.InputJsonValue
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resource: "Student",
      resourceId,
      oldValue,
      newValue,
    },
  });
}
