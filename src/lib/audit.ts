import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// Generic audit-log helper. Mirrors the inline `prisma.auditLog.create` pattern
// used across the platform. For state changes made inside a transaction, prefer
// `tx.auditLog.create({ data: auditData(...) })` so the audit commits atomically
// with the change.

export interface AuditParams {
  userId: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
}

export function auditData(params: AuditParams): Prisma.AuditLogUncheckedCreateInput {
  return {
    userId: params.userId ?? null,
    action: params.action,
    resource: params.resource,
    resourceId: params.resourceId ?? null,
    ...(params.oldValue !== undefined ? { oldValue: params.oldValue } : {}),
    ...(params.newValue !== undefined ? { newValue: params.newValue } : {}),
  };
}

export async function logAudit(params: AuditParams) {
  return prisma.auditLog.create({ data: auditData(params) });
}
