/**
 * Course-level commission calculator.
 * Single source of truth used by the commission engine, preview API, and UI.
 */

// A slab is an APPLICATION-COUNT tier with a FIXED commission amount.
// e.g. { min: 1, max: 10, amount: 20000 } → admissions 1–10 earn 20,000 each.
export interface SlabRule {
  min: number; // application number (from)
  max: number; // application number (to)
  amount: number; // fixed commission amount for admissions in this tier
}

export interface CommissionConfig {
  commissionType: "FIXED" | "PERCENTAGE" | "SLAB" | null | undefined;
  commissionValue: number | null | undefined; // fixed amount OR percentage value
  commissionRules: SlabRule[] | null | undefined; // slab rules
}

export interface CommissionResult {
  commissionAmount: number;
  appliedType: string;
  appliedRate: number | null; // percentage or null for fixed
  appliedSlab: SlabRule | null;
  currency: string;
}

/**
 * Calculate commission from course config and tuition amount paid.
 */
export function calculateCourseCommission(
  config: CommissionConfig,
  tuitionAmount: number,
  currency = "INR",
  // For SLAB: which admission number this is for the agency+course (1-based).
  applicationIndex = 1
): CommissionResult | null {
  if (!config.commissionType) return null;

  switch (config.commissionType) {
    case "FIXED": {
      const amount = Number(config.commissionValue ?? 0);
      return {
        commissionAmount: amount,
        appliedType: "FIXED",
        appliedRate: null,
        appliedSlab: null,
        currency,
      };
    }

    case "PERCENTAGE": {
      const rate = Number(config.commissionValue ?? 0);
      const amount = (tuitionAmount * rate) / 100;
      return {
        commissionAmount: parseFloat(amount.toFixed(2)),
        appliedType: "PERCENTAGE",
        appliedRate: rate,
        appliedSlab: null,
        currency,
      };
    }

    case "SLAB": {
      const rules = (config.commissionRules ?? []) as SlabRule[];
      if (rules.length === 0) return null;

      // Slabs are application-count tiers with a fixed amount.
      const slab =
        rules.find((r) => applicationIndex >= r.min && applicationIndex <= r.max) ??
        rules[rules.length - 1]; // fall back to the last tier beyond all ranges

      return {
        commissionAmount: Number(slab.amount ?? 0),
        appliedType: "SLAB",
        appliedRate: null,
        appliedSlab: slab,
        currency,
      };
    }

    default:
      return null;
  }
}

/**
 * Format commission description for UI display.
 */
export function formatCommissionLabel(
  config: CommissionConfig,
  currency = "INR",
  annualFee?: number
): string {
  if (!config.commissionType) return "No commission configured";

  const sym = getCurrencySymbol(currency);

  switch (config.commissionType) {
    case "FIXED":
      return `${sym}${Number(config.commissionValue ?? 0).toLocaleString("en-IN")} per admission`;

    case "PERCENTAGE": {
      const pct = Number(config.commissionValue ?? 0);
      if (annualFee) {
        const expected = (annualFee * pct) / 100;
        return `${pct}% of tuition ≈ ${sym}${expected.toLocaleString("en-IN")}`;
      }
      return `${pct}% of tuition paid`;
    }

    case "SLAB": {
      const rules = (config.commissionRules ?? []) as SlabRule[];
      if (rules.length === 0) return "Slab-based (no tiers set)";
      const tiers = rules
        .map((r) => `${sym}${Number(r.amount ?? 0).toLocaleString("en-IN")} (apps ${r.min}–${r.max})`)
        .join(", ");
      return `Slab-based: ${tiers}`;
    }

    default:
      return "Not configured";
  }
}

export function getCurrencySymbol(currency: string): string {
  const map: Record<string, string> = {
    INR: "₹",
    AED: "AED ",
    USD: "$",
    GBP: "£",
    EUR: "€",
    SGD: "S$",
    AUD: "A$",
    CAD: "C$",
  };
  return map[currency] ?? currency + " ";
}

/**
 * Parse commissionRules from DB (can be Prisma JsonValue) into typed SlabRule[].
 */
export function parseSlabRules(raw: unknown): SlabRule[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is SlabRule =>
      typeof r === "object" &&
      r !== null &&
      typeof (r as SlabRule).min === "number" &&
      typeof (r as SlabRule).max === "number" &&
      typeof (r as SlabRule).amount === "number"
  );
}
