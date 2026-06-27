/**
 * Calculate commission amount based on type and rate.
 * This is a pure utility function (not a Server Action).
 */
export function calculateCommission(
  tuitionAmount: number,
  type: "FIXED" | "PERCENTAGE" | "SLAB",
  rate: number
): number {
  switch (type) {
    case "FIXED":
      return rate;
    case "PERCENTAGE":
      return (tuitionAmount * rate) / 100;
    case "SLAB":
      // For slab-based: same as percentage at this stage
      // In production, implement bracket-based calculation
      return (tuitionAmount * rate) / 100;
    default:
      return 0;
  }
}
