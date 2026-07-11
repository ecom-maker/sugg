import { prisma } from "@/lib/prisma";

// Thin accessor over the platform_settings key/value table. Used for
// platform-wide toggles such as territory-aware lead assignment.

export const SETTINGS = {
  TERRITORY_AWARE_LEAD_ASSIGNMENT: "territoryAwareLeadAssignment",
} as const;

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function getBoolSetting(key: string, fallback = false): Promise<boolean> {
  const value = await getSetting(key);
  if (value === null) return fallback;
  return value === "true";
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/** Territory-aware Sugg-internal lead assignment. Ships OFF by default. */
export async function isTerritoryAwareAssignmentEnabled(): Promise<boolean> {
  return getBoolSetting(SETTINGS.TERRITORY_AWARE_LEAD_ASSIGNMENT, false);
}
