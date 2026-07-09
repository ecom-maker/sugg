/**
 * Normalize phone numbers to E.164 digits (no + prefix) for dedup.
 * Default country code: 91 (India) when 10-digit local number.
 */
export function normalizeMobileE164(phone: string, defaultCountryCode = "91"): string {
  let digits = phone.replace(/\D/g, "");

  // Strip leading zeros
  digits = digits.replace(/^0+/, "");

  if (digits.length === 10) {
    digits = defaultCountryCode + digits;
  }

  return digits;
}

export function formatMobileDisplay(normalized: string): string {
  if (normalized.startsWith("91") && normalized.length === 12) {
    return `+91 ${normalized.slice(2, 7)} ${normalized.slice(7)}`;
  }
  return `+${normalized}`;
}
