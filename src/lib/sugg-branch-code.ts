import { prisma } from "@/lib/prisma";

// ─── Sugg Branch code generation ─────────────────────────────────────────────
//
// Format: SUGG-<STATE>-<DISTRICT>-<seq>  e.g. SUGG-KL-PKD-1
//   STATE    = the state's stateCode (falls back to country code / name-derived)
//   DISTRICT = a short district abbreviation (curated map below, else derived)
//   seq      = incrementing number per (state, district) prefix
//
// When a branch is state-level (no district) the code is SUGG-<STATE>-<seq>;
// country-level is SUGG-<COUNTRY>-<seq>.

// Curated 3-letter district abbreviations for the populated Indian states.
// Anything not listed falls back to a derived abbreviation.
const DISTRICT_ABBR: Record<string, string> = {
  // Kerala
  Alappuzha: "ALP", Ernakulam: "EKM", Idukki: "IDK", Kannur: "KNR",
  Kasaragod: "KSD", Kollam: "KLM", Kottayam: "KTM", Kozhikode: "KKD",
  Malappuram: "MLP", Palakkad: "PKD", Pathanamthitta: "PTA",
  Thiruvananthapuram: "TVM", Thrissur: "TSR", Wayanad: "WYD",
  // Tamil Nadu
  Ariyalur: "ARY", Chengalpattu: "CGL", Chennai: "CHN", Coimbatore: "CBE",
  Cuddalore: "CUD", Dharmapuri: "DPI", Dindigul: "DGL", Erode: "ERD",
  Kallakurichi: "KLK", Kancheepuram: "KPM", Kanniyakumari: "KKM", Karur: "KRR",
  Krishnagiri: "KGI", Madurai: "MDU", Mayiladuthurai: "MYL", Nagapattinam: "NGP",
  Namakkal: "NMK", Nilgiris: "NLG", Perambalur: "PBR", Pudukkottai: "PDK",
  Ramanathapuram: "RMD", Ranipet: "RPT", Salem: "SLM", Sivaganga: "SVG",
  Tenkasi: "TKS", Thanjavur: "TNJ", Theni: "TNI", Thoothukudi: "TUT",
  Tiruchirappalli: "TRY", Tirunelveli: "TNV", Tirupathur: "TPT", Tiruppur: "TUP",
  Tiruvallur: "TLR", Tiruvannamalai: "TVL", Tiruvarur: "TVR", Vellore: "VLR",
  Viluppuram: "VPM", Virudhunagar: "VNR",
  // Karnataka
  Bagalkote: "BGK", Ballari: "BLY", Belagavi: "BGM", "Bengaluru Rural": "BNR",
  "Bengaluru Urban": "BLR", Bidar: "BDR", Chamarajanagar: "CJN",
  Chikkaballapura: "CBP", Chikkamagaluru: "CKM", Chitradurga: "CTA",
  "Dakshina Kannada": "DKN", Davanagere: "DVG", Dharwad: "DWD", Gadag: "GDG",
  Hassan: "HSN", Haveri: "HVR", Kalaburagi: "KLB", Kodagu: "KDG", Kolar: "KLR",
  Koppal: "KPL", Mandya: "MDY", Mysuru: "MYS", Raichur: "RCR", Ramanagara: "RMN",
  Shivamogga: "SMG", Tumakuru: "TMK", Udupi: "UDP", "Uttara Kannada": "UKN",
  Vijayanagara: "VJN", Vijayapura: "VJP", Yadgiri: "YDG",
};

/** Derive a 3-letter abbreviation: first letter + following consonants. */
function deriveAbbr(name: string): string {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "");
  if (!letters) return "XXX";
  const rest = letters.slice(1).replace(/[AEIOU]/g, "");
  return (letters[0] + rest).slice(0, 3).padEnd(3, "X");
}

export function districtAbbr(name: string): string {
  return DISTRICT_ABBR[name] ?? deriveAbbr(name);
}

interface GeoIds {
  countryId?: string | null;
  stateId?: string | null;
  districtId?: string | null;
}

/** Build the prefix (everything before the trailing "-<seq>"). */
async function buildPrefix(geo: GeoIds): Promise<string> {
  const [state, district, country] = await Promise.all([
    geo.stateId
      ? prisma.state.findUnique({ where: { id: geo.stateId }, select: { stateCode: true, stateName: true } })
      : Promise.resolve(null),
    geo.districtId
      ? prisma.district.findUnique({ where: { id: geo.districtId }, select: { districtName: true } })
      : Promise.resolve(null),
    geo.countryId
      ? prisma.country.findUnique({ where: { id: geo.countryId }, select: { countryCode: true } })
      : Promise.resolve(null),
  ]);

  const stateSeg =
    state?.stateCode?.toUpperCase() ||
    (state?.stateName ? state.stateName.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() : null) ||
    country?.countryCode?.toUpperCase() ||
    "XX";

  if (district) return `SUGG-${stateSeg}-${districtAbbr(district.districtName)}`;
  return `SUGG-${stateSeg}`;
}

/** Next sequence for a prefix, based on existing branch codes. */
async function nextSequence(prefix: string): Promise<number> {
  const existing = await prisma.suggBranch.findMany({
    where: { branchCode: { startsWith: `${prefix}-` } },
    select: { branchCode: true },
  });
  let max = 0;
  for (const { branchCode } of existing) {
    const m = branchCode.match(/-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

/** Preview the code that would be generated for the given geography. */
export async function previewSuggBranchCode(geo: GeoIds): Promise<string> {
  const prefix = await buildPrefix(geo);
  return `${prefix}-${await nextSequence(prefix)}`;
}

/**
 * Generate a unique Sugg Branch code. Retries the sequence if a race produced a
 * collision against the unique constraint.
 */
export async function generateSuggBranchCode(geo: GeoIds): Promise<string> {
  const prefix = await buildPrefix(geo);
  let seq = await nextSequence(prefix);
  // Guard against a rare race: bump until the code is free.
  for (let i = 0; i < 20; i++) {
    const code = `${prefix}-${seq}`;
    const clash = await prisma.suggBranch.findUnique({ where: { branchCode: code }, select: { id: true } });
    if (!clash) return code;
    seq += 1;
  }
  // Extremely unlikely fallback.
  return `${prefix}-${Date.now()}`;
}
