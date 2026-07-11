import { PrismaClient } from "@prisma/client";
import { seedGeo } from "./seed-geo";

// One-off idempotent populate of India geo reference data (Kerala, Tamil Nadu,
// Karnataka with all districts). Safe to re-run.
//
// Run:  DATABASE_URL=... node_modules/.bin/tsx prisma/populate-india-geo.ts

const prisma = new PrismaClient();

// Legacy Karnataka district names seeded earlier → official current names.
// Renaming (rather than adding) preserves the district ids and any FK
// references, and avoids duplicate entries in the dropdown.
const KARNATAKA_RENAMES: Record<string, string> = {
  Bangalore: "Bengaluru Urban",
  Mysore: "Mysuru",
  Mangalore: "Dakshina Kannada",
};

async function main() {
  const india = await prisma.country.findUnique({
    where: { countryCode: "IN" },
    select: { id: true },
  });

  if (india) {
    const karnataka = await prisma.state.findUnique({
      where: { countryId_stateName: { countryId: india.id, stateName: "Karnataka" } },
      select: { id: true },
    });
    if (karnataka) {
      for (const [legacy, official] of Object.entries(KARNATAKA_RENAMES)) {
        // Skip if the official name already exists (avoids a unique-constraint clash).
        const officialExists = await prisma.district.findUnique({
          where: { stateId_districtName: { stateId: karnataka.id, districtName: official } },
          select: { id: true },
        });
        if (officialExists) continue;
        const res = await prisma.district.updateMany({
          where: { stateId: karnataka.id, districtName: legacy },
          data: { districtName: official },
        });
        if (res.count) console.log(`Renamed Karnataka district: ${legacy} → ${official}`);
      }
    }
  }

  // Upsert India (+ UAE) states and all districts, including the full lists.
  await seedGeo(prisma);

  // Report district counts for the target states.
  const indiaAfter = await prisma.country.findUnique({
    where: { countryCode: "IN" },
    select: { id: true },
  });
  if (indiaAfter) {
    for (const stateName of ["Kerala", "Tamil Nadu", "Karnataka"]) {
      const state = await prisma.state.findUnique({
        where: { countryId_stateName: { countryId: indiaAfter.id, stateName } },
        select: { _count: { select: { districts: true } } },
      });
      console.log(`${stateName}: ${state?._count.districts ?? 0} districts`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
