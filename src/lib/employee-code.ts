import { prisma } from "@/lib/prisma";

const PREFIX = "SUGG-EMP-";
const PAD = 4;

/** Formats a sequence number into an employee code, e.g. 1 -> "SUGG-EMP-0001". */
export function formatEmployeeCode(seq: number): string {
  return `${PREFIX}${String(seq).padStart(PAD, "0")}`;
}

/**
 * The next code the system would assign, based on the current employee count.
 * `offset` bumps the sequence when retrying after a unique-code collision.
 * This is a preview only — the authoritative value is assigned on create.
 */
export async function nextEmployeeCode(offset = 0): Promise<string> {
  const count = await prisma.employee.count();
  return formatEmployeeCode(count + 1 + offset);
}
