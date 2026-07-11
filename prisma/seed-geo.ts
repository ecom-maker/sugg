import { PrismaClient } from "@prisma/client";

/** Seed India + UAE geographic reference data. Returns lookup helpers. */
export async function seedGeo(prisma: PrismaClient) {
  const india = await prisma.country.upsert({
    where: { countryCode: "IN" },
    update: {},
    create: { countryName: "India", countryCode: "IN", status: "ACTIVE" },
  });

  const uae = await prisma.country.upsert({
    where: { countryCode: "AE" },
    update: {},
    create: { countryName: "United Arab Emirates", countryCode: "AE", status: "ACTIVE" },
  });

  const indiaStates: { name: string; code: string; districts: string[] }[] = [
    { name: "Delhi", code: "DL", districts: ["New Delhi", "South Delhi", "North Delhi"] },
    { name: "Maharashtra", code: "MH", districts: ["Mumbai", "Pune", "Nagpur"] },
    { name: "Gujarat", code: "GJ", districts: ["Ahmedabad", "Surat", "Vadodara"] },
    {
      name: "Kerala",
      code: "KL",
      // All 14 districts.
      districts: [
        "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam",
        "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta",
        "Thiruvananthapuram", "Thrissur", "Wayanad",
      ],
    },
    {
      name: "Tamil Nadu",
      code: "TN",
      // All 38 districts.
      districts: [
        "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore",
        "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kancheepuram",
        "Kanniyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai",
        "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
        "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi",
        "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
        "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur",
        "Vellore", "Viluppuram", "Virudhunagar",
      ],
    },
    {
      name: "Karnataka",
      code: "KA",
      // All 31 districts (official current names).
      districts: [
        "Bagalkote", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban",
        "Bidar", "Chamarajanagar", "Chikkaballapura", "Chikkamagaluru",
        "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag",
        "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya",
        "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi",
        "Uttara Kannada", "Vijayanagara", "Vijayapura", "Yadgiri",
      ],
    },
  ];

  const uaeStates: { name: string; code: string; districts: string[] }[] = [
    { name: "Dubai", code: "DU", districts: ["Dubai City", "Deira", "Jumeirah"] },
    { name: "Abu Dhabi", code: "AZ", districts: ["Abu Dhabi City", "Al Ain"] },
    { name: "Sharjah", code: "SH", districts: ["Sharjah City"] },
  ];

  const geo: Record<string, { countryId: string; stateId: string; districtId: string }> = {};

  for (const s of indiaStates) {
    const state = await prisma.state.upsert({
      where: { countryId_stateName: { countryId: india.id, stateName: s.name } },
      update: {},
      create: { countryId: india.id, stateName: s.name, stateCode: s.code, status: "ACTIVE" },
    });
    for (const d of s.districts) {
      const district = await prisma.district.upsert({
        where: { stateId_districtName: { stateId: state.id, districtName: d } },
        update: {},
        create: { stateId: state.id, districtName: d, status: "ACTIVE" },
      });
      geo[`IN:${s.name}:${d}`] = { countryId: india.id, stateId: state.id, districtId: district.id };
    }
  }

  for (const s of uaeStates) {
    const state = await prisma.state.upsert({
      where: { countryId_stateName: { countryId: uae.id, stateName: s.name } },
      update: {},
      create: { countryId: uae.id, stateName: s.name, stateCode: s.code, status: "ACTIVE" },
    });
    for (const d of s.districts) {
      const district = await prisma.district.upsert({
        where: { stateId_districtName: { stateId: state.id, districtName: d } },
        update: {},
        create: { stateId: state.id, districtName: d, status: "ACTIVE" },
      });
      geo[`AE:${s.name}:${d}`] = { countryId: uae.id, stateId: state.id, districtId: district.id };
    }
  }

  console.log("✅ Geographic reference data seeded (India + UAE)");
  return { india, uae, geo };
}
