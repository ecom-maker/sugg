import { PrismaClient, type DegreeType } from "@prisma/client";

type Entry = { name: string; degreeType: DegreeType; field: string; duration?: string };

/**
 * Master catalog of standard courses offered in India (UG + PG + Diploma +
 * Certificate + Doctorate), across major fields. Generated + curated.
 */
function buildCatalog(): Entry[] {
  const out: Entry[] = [];
  const add = (e: Entry) => out.push(e);

  // ── Engineering ────────────────────────────────────────────────────────────
  const engBranches = [
    "Computer Science & Engineering", "Information Technology", "Artificial Intelligence & Machine Learning",
    "Data Science", "Electronics & Communication Engineering", "Electrical Engineering",
    "Electrical & Electronics Engineering", "Mechanical Engineering", "Civil Engineering",
    "Chemical Engineering", "Aerospace Engineering", "Aeronautical Engineering", "Automobile Engineering",
    "Biotechnology", "Biomedical Engineering", "Instrumentation Engineering", "Metallurgical Engineering",
    "Mining Engineering", "Production Engineering", "Industrial Engineering", "Marine Engineering",
    "Petroleum Engineering", "Agricultural Engineering", "Environmental Engineering", "Robotics & Automation",
    "Mechatronics", "Textile Engineering", "Food Technology", "Electronics & Instrumentation",
    "Computer Science & Business Systems", "Cyber Security", "Internet of Things",
  ];
  for (const b of engBranches) {
    add({ name: `B.Tech ${b}`, degreeType: "BACHELOR", field: "Engineering", duration: "4 years" });
    add({ name: `B.E. ${b}`, degreeType: "BACHELOR", field: "Engineering", duration: "4 years" });
    add({ name: `M.Tech ${b}`, degreeType: "MASTER", field: "Engineering", duration: "2 years" });
    add({ name: `Diploma in ${b}`, degreeType: "DIPLOMA", field: "Engineering", duration: "3 years" });
  }

  // ── Science (B.Sc / M.Sc) ───────────────────────────────────────────────────
  const sciSubjects = [
    "Physics", "Chemistry", "Mathematics", "Biology", "Botany", "Zoology", "Microbiology",
    "Biotechnology", "Biochemistry", "Computer Science", "Information Technology", "Statistics",
    "Electronics", "Environmental Science", "Geology", "Agriculture", "Horticulture", "Forensic Science",
    "Data Science", "Home Science", "Nautical Science", "Physical Science", "Life Sciences",
    "Food Science & Nutrition", "Fashion Design", "Animation & Multimedia", "Psychology", "Geography",
  ];
  for (const s of sciSubjects) {
    add({ name: `B.Sc ${s}`, degreeType: "BACHELOR", field: "Science", duration: "3 years" });
    add({ name: `M.Sc ${s}`, degreeType: "MASTER", field: "Science", duration: "2 years" });
  }
  add({ name: "B.Sc (Hons) Agriculture", degreeType: "BACHELOR", field: "Agriculture", duration: "4 years" });
  add({ name: "B.Sc Nursing", degreeType: "BACHELOR", field: "Medical & Health Sciences", duration: "4 years" });

  // ── Commerce ────────────────────────────────────────────────────────────────
  const comStreams = [
    "General", "Honours", "Accounting & Finance", "Banking & Insurance", "Taxation",
    "Computer Applications", "Financial Markets", "Business Administration", "E-Commerce",
  ];
  for (const c of comStreams) {
    add({ name: `B.Com ${c}`.replace("B.Com General", "B.Com"), degreeType: "BACHELOR", field: "Commerce", duration: "3 years" });
  }
  add({ name: "M.Com", degreeType: "MASTER", field: "Commerce", duration: "2 years" });
  add({ name: "M.Com Accounting & Finance", degreeType: "MASTER", field: "Commerce", duration: "2 years" });

  // ── Arts & Humanities (B.A. / M.A.) ─────────────────────────────────────────
  const artsSubjects = [
    "English", "History", "Political Science", "Economics", "Sociology", "Psychology", "Philosophy",
    "Geography", "Public Administration", "Journalism & Mass Communication", "Social Work", "Hindi",
    "Sanskrit", "Fine Arts", "Anthropology", "Archaeology", "Education", "Home Science",
    "Rural Development", "Development Studies", "International Relations", "Linguistics",
  ];
  for (const a of artsSubjects) {
    add({ name: `B.A. ${a}`, degreeType: "BACHELOR", field: "Arts & Humanities", duration: "3 years" });
    add({ name: `M.A. ${a}`, degreeType: "MASTER", field: "Arts & Humanities", duration: "2 years" });
  }
  add({ name: "B.A. (Hons)", degreeType: "BACHELOR", field: "Arts & Humanities", duration: "3 years" });

  // ── Management ──────────────────────────────────────────────────────────────
  const mgmt: Entry[] = [
    { name: "BBA (Bachelor of Business Administration)", degreeType: "BACHELOR", field: "Management", duration: "3 years" },
    { name: "BBA Business Analytics", degreeType: "BACHELOR", field: "Management", duration: "3 years" },
    { name: "BBA International Business", degreeType: "BACHELOR", field: "Management", duration: "3 years" },
    { name: "BMS (Bachelor of Management Studies)", degreeType: "BACHELOR", field: "Management", duration: "3 years" },
    { name: "MBA (Master of Business Administration)", degreeType: "MASTER", field: "Management", duration: "2 years" },
    { name: "MBA Finance", degreeType: "MASTER", field: "Management", duration: "2 years" },
    { name: "MBA Marketing", degreeType: "MASTER", field: "Management", duration: "2 years" },
    { name: "MBA Human Resources", degreeType: "MASTER", field: "Management", duration: "2 years" },
    { name: "MBA Operations", degreeType: "MASTER", field: "Management", duration: "2 years" },
    { name: "MBA Business Analytics", degreeType: "MASTER", field: "Management", duration: "2 years" },
    { name: "MBA Information Technology", degreeType: "MASTER", field: "Management", duration: "2 years" },
    { name: "PGDM (Post Graduate Diploma in Management)", degreeType: "DIPLOMA", field: "Management", duration: "2 years" },
    { name: "Executive MBA", degreeType: "MASTER", field: "Management", duration: "1 year" },
  ];
  mgmt.forEach(add);

  // ── Computer Applications ───────────────────────────────────────────────────
  add({ name: "BCA (Bachelor of Computer Applications)", degreeType: "BACHELOR", field: "Computer Applications", duration: "3 years" });
  add({ name: "MCA (Master of Computer Applications)", degreeType: "MASTER", field: "Computer Applications", duration: "2 years" });
  add({ name: "PGDCA", degreeType: "DIPLOMA", field: "Computer Applications", duration: "1 year" });

  // ── Medical & Health Sciences ───────────────────────────────────────────────
  const med: Entry[] = [
    { name: "MBBS", degreeType: "BACHELOR", field: "Medical & Health Sciences", duration: "5.5 years" },
    { name: "BDS (Dental)", degreeType: "BACHELOR", field: "Medical & Health Sciences", duration: "5 years" },
    { name: "BAMS (Ayurveda)", degreeType: "BACHELOR", field: "Medical & Health Sciences", duration: "5.5 years" },
    { name: "BHMS (Homeopathy)", degreeType: "BACHELOR", field: "Medical & Health Sciences", duration: "5.5 years" },
    { name: "BUMS (Unani)", degreeType: "BACHELOR", field: "Medical & Health Sciences", duration: "5.5 years" },
    { name: "BPT (Physiotherapy)", degreeType: "BACHELOR", field: "Medical & Health Sciences", duration: "4.5 years" },
    { name: "BOT (Occupational Therapy)", degreeType: "BACHELOR", field: "Medical & Health Sciences", duration: "4.5 years" },
    { name: "B.Sc Medical Lab Technology", degreeType: "BACHELOR", field: "Medical & Health Sciences", duration: "3 years" },
    { name: "B.Sc Radiology & Imaging Technology", degreeType: "BACHELOR", field: "Medical & Health Sciences", duration: "3 years" },
    { name: "B.Optom (Optometry)", degreeType: "BACHELOR", field: "Medical & Health Sciences", duration: "4 years" },
    { name: "BVSc & AH (Veterinary)", degreeType: "BACHELOR", field: "Medical & Health Sciences", duration: "5 years" },
    { name: "B.Pharm", degreeType: "BACHELOR", field: "Pharmacy", duration: "4 years" },
    { name: "D.Pharm", degreeType: "DIPLOMA", field: "Pharmacy", duration: "2 years" },
    { name: "Pharm.D", degreeType: "DOCTORATE", field: "Pharmacy", duration: "6 years" },
    { name: "GNM (General Nursing & Midwifery)", degreeType: "DIPLOMA", field: "Medical & Health Sciences", duration: "3 years" },
    { name: "ANM (Auxiliary Nursing Midwifery)", degreeType: "DIPLOMA", field: "Medical & Health Sciences", duration: "2 years" },
    { name: "MD (Doctor of Medicine)", degreeType: "MASTER", field: "Medical & Health Sciences", duration: "3 years" },
    { name: "MS (Master of Surgery)", degreeType: "MASTER", field: "Medical & Health Sciences", duration: "3 years" },
    { name: "MDS (Master of Dental Surgery)", degreeType: "MASTER", field: "Medical & Health Sciences", duration: "3 years" },
    { name: "M.Pharm", degreeType: "MASTER", field: "Pharmacy", duration: "2 years" },
    { name: "MPT (Physiotherapy)", degreeType: "MASTER", field: "Medical & Health Sciences", duration: "2 years" },
    { name: "M.Sc Nursing", degreeType: "MASTER", field: "Medical & Health Sciences", duration: "2 years" },
  ];
  med.forEach(add);

  // ── Law ─────────────────────────────────────────────────────────────────────
  const law: Entry[] = [
    { name: "LLB (Bachelor of Laws)", degreeType: "BACHELOR", field: "Law", duration: "3 years" },
    { name: "BA LLB (Hons)", degreeType: "BACHELOR", field: "Law", duration: "5 years" },
    { name: "BBA LLB (Hons)", degreeType: "BACHELOR", field: "Law", duration: "5 years" },
    { name: "B.Com LLB (Hons)", degreeType: "BACHELOR", field: "Law", duration: "5 years" },
    { name: "LLM (Master of Laws)", degreeType: "MASTER", field: "Law", duration: "1 year" },
  ];
  law.forEach(add);

  // ── Architecture & Design ───────────────────────────────────────────────────
  const design: Entry[] = [
    { name: "B.Arch (Architecture)", degreeType: "BACHELOR", field: "Architecture", duration: "5 years" },
    { name: "M.Arch", degreeType: "MASTER", field: "Architecture", duration: "2 years" },
    { name: "B.Plan (Planning)", degreeType: "BACHELOR", field: "Architecture", duration: "4 years" },
    { name: "B.Des (Design)", degreeType: "BACHELOR", field: "Design", duration: "4 years" },
    { name: "B.Des Fashion Design", degreeType: "BACHELOR", field: "Design", duration: "4 years" },
    { name: "B.Des Interior Design", degreeType: "BACHELOR", field: "Design", duration: "4 years" },
    { name: "B.Des Product Design", degreeType: "BACHELOR", field: "Design", duration: "4 years" },
    { name: "M.Des", degreeType: "MASTER", field: "Design", duration: "2 years" },
  ];
  design.forEach(add);

  // ── Education ────────────────────────────────────────────────────────────────
  const edu: Entry[] = [
    { name: "B.Ed (Bachelor of Education)", degreeType: "BACHELOR", field: "Education", duration: "2 years" },
    { name: "M.Ed (Master of Education)", degreeType: "MASTER", field: "Education", duration: "2 years" },
    { name: "D.El.Ed", degreeType: "DIPLOMA", field: "Education", duration: "2 years" },
    { name: "BPEd (Physical Education)", degreeType: "BACHELOR", field: "Education", duration: "2 years" },
    { name: "B.El.Ed", degreeType: "BACHELOR", field: "Education", duration: "4 years" },
  ];
  edu.forEach(add);

  // ── Other professional / vocational ─────────────────────────────────────────
  const other: Entry[] = [
    { name: "BHM (Hotel Management)", degreeType: "BACHELOR", field: "Hotel Management", duration: "4 years" },
    { name: "B.Sc Hospitality & Hotel Administration", degreeType: "BACHELOR", field: "Hotel Management", duration: "3 years" },
    { name: "Diploma in Hotel Management", degreeType: "DIPLOMA", field: "Hotel Management", duration: "3 years" },
    { name: "BJMC (Journalism & Mass Communication)", degreeType: "BACHELOR", field: "Media & Journalism", duration: "3 years" },
    { name: "BMM (Mass Media)", degreeType: "BACHELOR", field: "Media & Journalism", duration: "3 years" },
    { name: "MJMC", degreeType: "MASTER", field: "Media & Journalism", duration: "2 years" },
    { name: "BFA (Fine Arts)", degreeType: "BACHELOR", field: "Fine Arts", duration: "4 years" },
    { name: "MFA (Fine Arts)", degreeType: "MASTER", field: "Fine Arts", duration: "2 years" },
    { name: "B.Mus (Music)", degreeType: "BACHELOR", field: "Fine Arts", duration: "3 years" },
    { name: "B.Sc Agriculture", degreeType: "BACHELOR", field: "Agriculture", duration: "4 years" },
    { name: "B.Sc Horticulture", degreeType: "BACHELOR", field: "Agriculture", duration: "4 years" },
    { name: "B.Voc (Vocational)", degreeType: "BACHELOR", field: "Vocational", duration: "3 years" },
    { name: "B.Lib.Sc (Library Science)", degreeType: "BACHELOR", field: "Arts & Humanities", duration: "1 year" },
    { name: "BSW (Social Work)", degreeType: "BACHELOR", field: "Arts & Humanities", duration: "3 years" },
    { name: "MSW (Social Work)", degreeType: "MASTER", field: "Arts & Humanities", duration: "2 years" },
    { name: "Ph.D (Doctor of Philosophy)", degreeType: "DOCTORATE", field: "Research", duration: "3-5 years" },
    { name: "Integrated M.Sc", degreeType: "MASTER", field: "Science", duration: "5 years" },
    { name: "Integrated MBA", degreeType: "MASTER", field: "Management", duration: "5 years" },
  ];
  other.forEach(add);

  // Dedupe by name + degreeType.
  const seen = new Set<string>();
  return out.filter((e) => {
    const k = `${e.name}||${e.degreeType}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function seedCourseCatalog(prisma: PrismaClient) {
  const data = buildCatalog();
  const res = await prisma.courseCatalog.createMany({ data, skipDuplicates: true });
  console.log(`✅ Course catalog: ${data.length} entries prepared, ${res.count} inserted`);
  return data.length;
}
