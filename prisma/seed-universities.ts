import { PrismaClient, type UniversityType } from "@prisma/client";

type U = { name: string; establishmentYear: number; city: string; state?: string; type: UniversityType };

// Tamil Nadu universities (central, state, deemed, private). Establishment years
// are well-known founding years (best-effort). Idempotent via unique name.
const TAMIL_NADU_UNIVERSITIES: U[] = [
  // Central / National institutions
  { name: "Central University of Tamil Nadu (CUTN)", establishmentYear: 2009, city: "Thiruvarur", type: "PUBLIC" },
  { name: "Indian Institute of Technology Madras (IIT Madras)", establishmentYear: 1959, city: "Chennai", type: "PUBLIC" },
  { name: "Indian Maritime University", establishmentYear: 2008, city: "Chennai", type: "PUBLIC" },
  { name: "National Institute of Technology, Tiruchirappalli (NIT Trichy)", establishmentYear: 1964, city: "Tiruchirappalli", type: "PUBLIC" },
  { name: "Indian Institute of Information Technology, Design & Manufacturing (IIITDM) Kancheepuram", establishmentYear: 2007, city: "Chennai", type: "PUBLIC" },
  { name: "Gandhigram Rural Institute", establishmentYear: 1956, city: "Dindigul", type: "PUBLIC" },
  { name: "Rajiv Gandhi National Institute of Youth Development (RGNIYD)", establishmentYear: 1993, city: "Sriperumbudur", type: "PUBLIC" },
  // State universities
  { name: "Anna University", establishmentYear: 1978, city: "Chennai", type: "PUBLIC" },
  { name: "University of Madras", establishmentYear: 1857, city: "Chennai", type: "PUBLIC" },
  { name: "Bharathiar University", establishmentYear: 1982, city: "Coimbatore", type: "PUBLIC" },
  { name: "Bharathidasan University", establishmentYear: 1982, city: "Tiruchirappalli", type: "PUBLIC" },
  { name: "Madurai Kamaraj University (MKU)", establishmentYear: 1966, city: "Madurai", type: "PUBLIC" },
  { name: "Alagappa University", establishmentYear: 1985, city: "Karaikudi", type: "PUBLIC" },
  { name: "Periyar University", establishmentYear: 1997, city: "Salem", type: "PUBLIC" },
  { name: "Tamil Nadu Agricultural University (TNAU)", establishmentYear: 1971, city: "Coimbatore", type: "PUBLIC" },
  { name: "Tamil Nadu Dr. Ambedkar Law University (TNDALU)", establishmentYear: 1997, city: "Chennai", type: "PUBLIC" },
  { name: "Tamil Nadu Dr. M.G.R. Medical University", establishmentYear: 1988, city: "Chennai", type: "PUBLIC" },
  { name: "Tamil Nadu Teacher Education University (TNTEU)", establishmentYear: 2008, city: "Chennai", type: "PUBLIC" },
  { name: "Tamil University", establishmentYear: 1981, city: "Thanjavur", type: "PUBLIC" },
  { name: "Tamil Nadu Open University (TNOU)", establishmentYear: 2002, city: "Chennai", type: "PUBLIC" },
  // Deemed universities
  { name: "Vellore Institute of Technology (VIT)", establishmentYear: 1984, city: "Vellore", type: "DEEMED" },
  { name: "SASTRA Deemed University", establishmentYear: 1984, city: "Thanjavur", type: "DEEMED" },
  { name: "SRM Institute of Science and Technology", establishmentYear: 1985, city: "Chennai", type: "DEEMED" },
  { name: "Amrita Vishwa Vidyapeetham", establishmentYear: 1994, city: "Coimbatore", type: "DEEMED" },
  { name: "Sathyabama Institute of Science and Technology", establishmentYear: 1987, city: "Chennai", type: "DEEMED" },
  { name: "Kalasalingam Academy of Research and Education", establishmentYear: 1984, city: "Krishnankoil", type: "DEEMED" },
  { name: "Chettinad Academy of Research and Education (CARE)", establishmentYear: 2008, city: "Kelambakkam", type: "DEEMED" },
  { name: "Sri Ramachandra Institute of Higher Education and Research", establishmentYear: 1985, city: "Chennai", type: "DEEMED" },
  { name: "Karunya Institute of Technology and Sciences", establishmentYear: 1986, city: "Coimbatore", type: "DEEMED" },
  { name: "Hindustan Institute of Technology and Science (HITS)", establishmentYear: 1985, city: "Chennai", type: "DEEMED" },
  { name: "Vels Institute of Science, Technology & Advanced Studies (VISTAS)", establishmentYear: 1992, city: "Chennai", type: "DEEMED" },
  { name: "St. Peter's Institute of Higher Education and Research", establishmentYear: 1993, city: "Chennai", type: "DEEMED" },
  { name: "Vel Tech Rangarajan Dr. Sagunthala R&D Institute of Science and Technology", establishmentYear: 1990, city: "Chennai", type: "DEEMED" },
  // Private universities
  { name: "Shiv Nadar University Chennai", establishmentYear: 2021, city: "Chennai", type: "PRIVATE" },
  { name: "Krea University", establishmentYear: 2018, city: "Sri City", state: "Andhra Pradesh", type: "PRIVATE" },
];

// Kerala state universities.
const KERALA_UNIVERSITIES: U[] = [
  { name: "APJ Abdul Kalam Technological University", establishmentYear: 2014, city: "Thiruvananthapuram", state: "Kerala", type: "PUBLIC" },
  { name: "University of Kerala", establishmentYear: 1937, city: "Thiruvananthapuram", state: "Kerala", type: "PUBLIC" },
  { name: "Mahatma Gandhi University", establishmentYear: 1983, city: "Kottayam", state: "Kerala", type: "PUBLIC" },
  { name: "Cochin University of Science & Technology (CUSAT)", establishmentYear: 1971, city: "Kochi", state: "Kerala", type: "PUBLIC" },
  { name: "University of Calicut", establishmentYear: 1968, city: "Malappuram", state: "Kerala", type: "PUBLIC" },
  { name: "Kannur University", establishmentYear: 1996, city: "Kannur", state: "Kerala", type: "PUBLIC" },
  { name: "Thunchath Ezhuthachan Malayalam University", establishmentYear: 2012, city: "Tirur", state: "Kerala", type: "PUBLIC" },
  { name: "National University of Advanced Legal Studies (NUALS)", establishmentYear: 2005, city: "Kochi", state: "Kerala", type: "PUBLIC" },
  { name: "Sree Sankaracharya University of Sanskrit", establishmentYear: 1993, city: "Kalady", state: "Kerala", type: "PUBLIC" },
];

const ALL_UNIVERSITIES: U[] = [...TAMIL_NADU_UNIVERSITIES, ...KERALA_UNIVERSITIES];

export async function seedUniversities(prisma: PrismaClient) {
  const res = await prisma.university.createMany({
    data: ALL_UNIVERSITIES.map((u) => ({
      name: u.name,
      establishmentYear: u.establishmentYear,
      location: u.city,
      city: u.city,
      state: u.state ?? "Tamil Nadu",
      country: "India",
      universityType: u.type,
      status: "ACTIVE",
    })),
    skipDuplicates: true,
  });
  console.log(`✅ Universities: ${ALL_UNIVERSITIES.length} prepared, ${res.count} inserted`);
}
