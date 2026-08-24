import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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

// ── Field-level change tracking ──────────────────────────────────────────────

// Minimal client shape so callers can pass either `prisma` or a transaction tx.
type AuditClient = { auditLog: { create: (args: { data: Prisma.AuditLogUncheckedCreateInput }) => unknown } };

function norm(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object" && "toString" in v && typeof (v as { toString: unknown }).toString === "function") {
    // Decimal etc. — compare/store their string form.
    return (v as { toString(): string }).toString();
  }
  return v;
}

/**
 * Field-level diff between a record's current values and the incoming update.
 * Returns only the keys (from `keys`) whose value actually changed, as
 * old/new maps ready to store on an audit log.
 */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys: string[]
): { oldValue: Record<string, unknown>; newValue: Record<string, unknown>; changed: boolean } {
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  for (const k of keys) {
    if (!(k in after)) continue; // field not part of this update
    const b = norm(before[k] ?? null);
    const a = norm(after[k] ?? null);
    if (String(b ?? "") !== String(a ?? "")) {
      oldValue[k] = b;
      newValue[k] = a;
    }
  }
  return { oldValue, newValue, changed: Object.keys(newValue).length > 0 };
}

/**
 * Write a change entry to the audit log. Pass a tx client to include it in a
 * transaction. Values are stored as JSON. Call only when there is a change.
 */
export async function recordChange(
  opts: {
    userId?: string | null;
    action: string;
    resource: string;
    resourceId: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
  },
  client: AuditClient = prisma as unknown as AuditClient
): Promise<void> {
  await client.auditLog.create({
    data: auditData({
      userId: opts.userId ?? null,
      action: opts.action,
      resource: opts.resource,
      resourceId: opts.resourceId,
      oldValue: opts.oldValue as Prisma.InputJsonValue | undefined,
      newValue: opts.newValue as Prisma.InputJsonValue | undefined,
    }),
  });
}
