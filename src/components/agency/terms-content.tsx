// Canonical Terms & Conditions for Agencies / Admission Counselors on Sugg.
// Rendered on the /agency-terms page and referenced from the acceptance popup.
// Keep AGENCY_TERMS_VERSION in sync if the wording is materially changed.

export const AGENCY_TERMS_VERSION = "1.0";
export const AGENCY_TERMS_TITLE = "Terms and Conditions for Agencies / Admission Counselors";

type Block = string | { list: string[] };
interface Section {
  n: string;
  heading: string;
  blocks: Block[];
}

const INTRO =
  'These Terms and Conditions ("Terms") govern the registration and use of the Sugg admission management platform, operated by Daksh Bio Dynamics, a company having its registered office at 4 / 347, Kuzhalmannam, Palakkad, Kerala, India ("Sugg", "we", "us", or "our"), by any agency, admission counselor, or education consultant that signs up on the Portal to refer, assist, or place Students for admission with Colleges listed on the Portal ("Agency", "you", or "your"). These Terms are accepted electronically by clicking the "I Accept" button (or any similarly worded acceptance button) after signing in to the Agency’s account on the Portal. If the Agency does not agree to these Terms, it must not click "I Accept" and must not register for or use the Portal.';

const SECTIONS: Section[] = [
  {
    n: "1",
    heading: "Definitions",
    blocks: [
      '"Portal" means the Sugg website, web application, mobile application, dashboard, and any related services through which Colleges list courses and Agencies refer and assist Students seeking admission.',
      '"College" means any educational institution that has activated a profile on the Portal to list its courses, fees, and admission-related information.',
      '"College Content" means all information, data, text, course details, fee structures, eligibility criteria, accreditation details, commission structures, and any other material uploaded or maintained by a College on the Portal.',
      '"Commission" means the referral or facilitation fee payable to the Agency for a successful Student admission or enrollment made through the Portal, at the rate and subject to the conditions displayed on the Portal or set out in an applicable commercial agreement.',
      '"Student" means any prospective or enrolled student referred, assisted, or placed by the Agency for admission to a College through the Portal.',
      '"Authorized User" means any individual who signs in to or accesses the Agency’s account on the Portal using the login credentials associated with that account, whether or not that individual is an owner, employee, or other agent of the Agency.',
    ],
  },
  {
    n: "2",
    heading: "Acceptance of Terms and Registration",
    blocks: [
      '2.1. These Terms are accepted electronically. By signing in to the Agency’s account on the Portal and clicking "I Accept", the Authorized User performing that action confirms, and the Agency agrees, that such click constitutes valid, binding, and irrevocable acceptance of these Terms by the Agency, with the same legal effect as if these Terms had been signed in physical form by an authorized representative of the Agency.',
      "2.2. The Agency acknowledges and agrees that any Authorized User who signs in to the Agency’s account and clicks \"I Accept\" shall be deemed to have the actual, implied, or apparent authority to bind the Agency to these Terms. The Agency is solely responsible for controlling and safeguarding access to its login credentials and Portal account, and Sugg shall not be liable for any acceptance, submission, or action taken by any Authorized User who accesses the Agency’s account, regardless of whether such access was in fact authorized by the Agency.",
      "2.3. The Agency shall not challenge or dispute the validity, binding nature, or enforceability of these Terms on the ground that the particular Authorized User who clicked \"I Accept\" lacked specific individual authority to bind the Agency, or on the ground that acceptance was given electronically rather than by physical or wet-ink signature. Electronic acceptance under this Clause 2 is valid and enforceable to the fullest extent permitted under applicable law, including the Information Technology Act, 2000 (India) and equivalent electronic contracting laws.",
      "2.4. The Agency represents and warrants that it is a duly constituted business entity, sole proprietorship, or individual counselor authorized to carry on admission counseling or education consultancy activities, and that all registration details, business identification, and tax details (including PAN/GST or equivalent, as applicable) provided to Sugg are true, accurate, and current. The Agency shall promptly update such details if they change.",
    ],
  },
  {
    n: "3",
    heading: "Role of Sugg and the Agency",
    blocks: [
      "3.1. Sugg operates the Portal solely as a technology platform that connects Colleges with Agencies and Students. Sugg is not a party to, and does not participate in, the counseling relationship between the Agency and any Student, nor the admission relationship between any Student and a College.",
      "3.2. Nothing in these Terms creates an employment relationship, partnership, joint venture, or agency relationship (in the legal sense) between Sugg and the Agency. The Agency acts as an independent third party at all times and is solely responsible for its own conduct, representations, and compliance with applicable law.",
    ],
  },
  {
    n: "4",
    heading: "No Responsibility for College-Provided Information",
    blocks: [
      '4.1. All course details, fee structures, accreditation status, commission structures, and other information appearing on a College’s profile ("College Content") are entered, maintained, and updated solely by the College. Sugg does not independently verify, audit, or certify the accuracy of any College Content.',
      "4.2. The Agency expressly acknowledges and agrees that Sugg shall not be responsible or liable, in any manner whatsoever, for any incorrect, outdated, misleading, or incomplete information published by a College regarding fees, courses, eligibility, accreditation, commission rates, or any other data on the Portal.",
      "4.3. The Agency shall independently verify critical information, including fees, seat availability, and accreditation status, directly with the College before relying on it or representing it to any Student. The Agency is solely responsible for any representation it makes to a Student based on College Content, and Sugg bears no liability for any loss, dispute, or claim arising from the Agency’s reliance on or communication of inaccurate College Content.",
    ],
  },
  {
    n: "5",
    heading: "No Collection of Fees on Behalf of Colleges",
    blocks: [
      "5.1. Sugg does not collect, hold, process, or manage tuition fees, application fees, or any other payments on behalf of any College. All fee payments must be made directly by the Student to the College through the College’s own designated payment channels.",
      "5.2. Sugg is not a payment intermediary, collection agent, or escrow service for any fee paid by a Student to a College, and bears no responsibility or liability for any payment dispute, delay, misuse, non-refund, or fraud relating to fees paid directly to a College.",
      "5.3. The Agency shall not represent to any Student that fees can be paid to, through, or on behalf of Sugg, and shall not itself collect, accept, or hold any Student fee payment on behalf of Sugg or any College. Any fee collection undertaken by the Agency on behalf of a College is a matter solely between the Agency and that College, and Sugg assumes no responsibility for it.",
    ],
  },
  {
    n: "6",
    heading: "Commission Eligibility and Rate",
    blocks: [
      "6.1. The Agency shall be eligible for Commission on successful Student admissions or enrollments effected through the Portal, at the rate and subject to the conditions displayed on the Portal for the relevant College, or as set out in an applicable commercial agreement between the Agency and Sugg.",
      "6.2. Commission rates are configured by each College and may vary by College and course. Sugg is not responsible for any shortfall, discrepancy, or dispute arising from a College’s incorrect or outdated commission configuration, save that Sugg shall pay the Agency the Commission rate actually received from the College in respect of the relevant admission.",
    ],
  },
  {
    n: "7",
    heading: "Commission Payment Terms",
    blocks: [
      "7.1. Sugg shall pay the Agency the applicable Commission within seven (7) days of Sugg’s actual receipt of the corresponding commission amount from the College in respect of that Student’s admission.",
      "7.2. The Agency acknowledges and agrees that Commission is contingent upon, and shall become payable only after, Sugg has actually received the corresponding funds from the College. Sugg shall not be liable for any delay or non-payment of Commission caused by a College’s delay, default, or failure to pay the commission amount to Sugg. In such circumstances, Sugg will use reasonable efforts to follow up with the College, but the Agency’s ability to recover such unpaid amounts shall be limited to what Sugg is able to recover from the College on the Agency’s behalf.",
      "7.3. The Agency is responsible for providing and maintaining accurate bank account, PAN/GST, and other tax registration details required for Commission payout. Sugg shall be entitled to deduct applicable taxes at source (including TDS) from Commission payments as required by law, and shall not be liable for any payout delay caused by incomplete or inaccurate details provided by the Agency.",
    ],
  },
  {
    n: "8",
    heading: "Commission Clawback and Reversal",
    blocks: [
      "8.1. If, after payment of Commission to the Agency, a Student withdraws admission, cancels enrollment, or the College reverses, cancels, or refunds the admission or fees for any reason, the Agency shall, upon Sugg’s written notice, refund to Sugg the Commission paid in respect of that admission.",
      "8.2. Sugg may, at its discretion, recover any such amount by adjusting or setting it off against future Commission payments due to the Agency, in addition to any other remedy available to Sugg under law.",
    ],
  },
  {
    n: "9",
    heading: "Agency Conduct and Responsibilities",
    blocks: [
      "9.1. The Agency shall deal with Students honestly and professionally, and shall not make any false, misleading, or unauthorized representation regarding a College’s courses, fees, accreditation, placement outcomes, or admission process.",
      "9.2. The Agency shall not guarantee admission to any Student, shall not charge a Student any fee for access to or use of the Portal, and shall not engage in coercive, deceptive, or unethical recruitment practices.",
      "9.3. The Agency shall comply with all applicable laws in the conduct of its counseling and referral activities, including consumer protection, advertising, and education regulatory requirements in the jurisdictions in which it operates.",
    ],
  },
  {
    n: "10",
    heading: "Student Data and Privacy",
    blocks: [
      "10.1. The Agency is responsible for ensuring it has a lawful basis to collect, process, and share any Student personal data obtained through the Portal or in the course of its counseling activities, and for complying with all applicable data protection laws in respect of such data.",
      "10.2. The Agency shall use Student data obtained through the Portal solely for legitimate admission counseling and referral purposes, and shall not sell, rent, or share such data with unauthorized third parties.",
    ],
  },
  {
    n: "11",
    heading: "No Guarantee of Leads or Admissions",
    blocks: [
      "Sugg does not guarantee any specific number of leads, referral opportunities, or successful Student admissions to the Agency, nor does it guarantee the accuracy of any information supplied by Colleges or Students on the Portal.",
    ],
  },
  {
    n: "12",
    heading: "Disclaimer and No Warranty",
    blocks: [
      'THE PORTAL AND ALL COLLEGE CONTENT ARE PROVIDED "AS IS" AND "AS AVAILABLE". SUGG EXPRESSLY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS OR IMPLIED, REGARDING THE ACCURACY, RELIABILITY, COMPLETENESS, OR FITNESS FOR PURPOSE OF ANY COLLEGE CONTENT, INCLUDING COURSE DETAILS, FEES, ACCREDITATION STATUS, OR COMMISSION TERMS DISPLAYED ON THE PORTAL.',
    ],
  },
  {
    n: "13",
    heading: "Indemnification",
    blocks: [
      "13.1. The Agency shall defend, indemnify, and hold harmless Sugg, its affiliates, directors, officers, employees, and agents from and against any and all claims, demands, losses, damages, liabilities, penalties, fines, costs, and expenses (including reasonable legal fees) arising out of or in connection with:",
      {
        list: [
          "Any false, misleading, or unauthorized representation made by the Agency to a Student regarding a College’s courses, fees, accreditation, or admission process;",
          "Any unauthorized collection or handling of Student fee payments by the Agency;",
          "The Agency’s breach of these Terms, applicable law, or any representation or warranty made herein;",
          "Any dispute between the Agency and a Student, or between the Agency and a College, arising from the Agency’s counseling or referral activities;",
          "The Agency’s reliance on, or communication to a Student of, inaccurate or outdated College Content.",
        ],
      },
      "13.2. This indemnification obligation shall survive the termination or expiry of the Agency’s registration and use of the Portal.",
    ],
  },
  {
    n: "14",
    heading: "Limitation of Liability",
    blocks: [
      "14.1. To the maximum extent permitted by applicable law, Sugg’s total aggregate liability to the Agency arising out of or in connection with the Portal or these Terms, whether in contract, tort, or otherwise, shall not exceed the total Commission actually paid by Sugg to the Agency in the three (3) months preceding the event giving rise to the claim.",
      "14.2. In no event shall Sugg be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits or loss of reputation, arising from the Agency’s use of the Portal or reliance on College Content.",
    ],
  },
  {
    n: "15",
    heading: "Confidentiality",
    blocks: [
      "The Agency shall keep confidential any non-public information relating to Sugg’s business, pricing, technology, or platform features that it becomes aware of through its use of the Portal, and shall not disclose such information to any third party without Sugg’s prior written consent.",
    ],
  },
  {
    n: "16",
    heading: "Intellectual Property",
    blocks: [
      "All trademarks, logos, software, and other intellectual property comprising the Portal remain the exclusive property of Sugg. The Agency is granted a limited, non-exclusive, non-transferable license to access and use the Portal solely for referring and assisting Students, and acquires no other rights in the Portal or its content.",
    ],
  },
  {
    n: "17",
    heading: "Non-Exclusivity",
    blocks: [
      "Unless otherwise agreed in a separate written agreement, the Agency’s use of the Portal is non-exclusive. The Agency remains free to work with other platforms, colleges, or education consultancy arrangements outside the Portal, and Sugg remains free to engage other agencies.",
    ],
  },
  {
    n: "18",
    heading: "Suspension and Termination",
    blocks: [
      "18.1. Sugg reserves the right to suspend or deactivate the Agency’s account, with or without prior notice, if the Agency is found to have made false or misleading representations to Students, collected unauthorized fee payments, breached these Terms, or engaged in conduct harmful to Students, Colleges, or the Portal’s integrity.",
      "18.2. The Agency may deactivate its account at any time by providing written notice to Sugg. Deactivation does not relieve the Agency of any clawback, indemnification, or other obligations accrued prior to the effective date of deactivation, nor does it affect Commission already earned and payable in accordance with Clause 7.",
    ],
  },
  {
    n: "19",
    heading: "Force Majeure",
    blocks: [
      "Sugg shall not be liable for any failure or delay in performance under these Terms resulting from causes beyond its reasonable control, including natural disasters, internet or telecommunications failures, government action, or other events of force majeure.",
    ],
  },
  {
    n: "20",
    heading: "Amendment of Terms",
    blocks: [
      "Sugg may revise these Terms from time to time by posting the updated Terms on the Portal. Continued use of the Portal or maintenance of an active Agency account after such changes take effect constitutes the Agency’s acceptance of the revised Terms.",
    ],
  },
  {
    n: "21",
    heading: "Governing Law and Dispute Resolution",
    blocks: [
      "21.1. These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles.",
      "21.2. Subject to Clause 21.3, the courts at Palakkad, India shall have exclusive jurisdiction over any dispute arising out of or in connection with these Terms.",
      "21.3. Any dispute, controversy, or claim arising out of or relating to these Terms shall first be referred to arbitration under the Arbitration and Conciliation Act, 1996, to be conducted by a sole arbitrator appointed by Sugg, with the seat and venue of arbitration at Palakkad, India, and the proceedings conducted in English.",
    ],
  },
  {
    n: "22",
    heading: "Notices",
    blocks: [
      "All notices under these Terms shall be sent in writing to the Agency’s registered email address on the Portal, and to Sugg at sudeepa@sugg.in. Notices shall be deemed delivered upon transmission if sent by email.",
    ],
  },
  {
    n: "23",
    heading: "Entire Agreement; Severability; Waiver",
    blocks: [
      "23.1. These Terms, together with any applicable commercial agreement, constitute the entire agreement between the Agency and Sugg regarding registration and use of the Portal, and supersede all prior discussions or understandings on the subject.",
      "23.2. If any provision of these Terms is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.",
      "23.3. No failure or delay by Sugg in exercising any right under these Terms shall operate as a waiver of that right.",
    ],
  },
  {
    n: "24",
    heading: "Electronic Acceptance",
    blocks: [
      '24.1. By signing in to its account on the Portal and clicking "I Accept", the Agency confirms that it has read, understood, and agrees to be bound by these Terms and Conditions, and specifically acknowledges that Sugg bears no responsibility for inaccurate College-provided information, does not collect Student fees on behalf of any College, and pays Commission only within seven (7) days of actually receiving the corresponding amount from the College.',
      '24.2. Sugg shall maintain a record of each acceptance of these Terms, including the date, time, Agency account, and the Authorized User action of clicking "I Accept". This record shall constitute conclusive evidence of the Agency’s acceptance of these Terms and of the date on which such acceptance took effect.',
      "24.3. No physical or wet-ink signature is required for these Terms to be valid and binding. The Agency may request a countersigned copy of these Terms for its internal records; provision of such a copy shall not affect the validity or effective date of the electronic acceptance recorded under Clause 24.2.",
    ],
  },
];

export function AgencyTermsContent() {
  return (
    <div className="text-sm leading-relaxed text-foreground/90 space-y-5">
      <div className="space-y-1">
        <p className="font-semibold uppercase tracking-wide text-foreground">
          Terms and Conditions for Agencies / Admission Counselors
        </p>
        <p className="font-medium text-muted-foreground">
          Using the Sugg Admission Management Platform (&ldquo;Terms&rdquo;)
        </p>
      </div>
      <p>{INTRO}</p>
      {SECTIONS.map((s) => (
        <section key={s.n} className="space-y-2">
          <h3 className="font-semibold text-foreground">
            {s.n}. {s.heading}
          </h3>
          {s.blocks.map((b, i) =>
            typeof b === "string" ? (
              <p key={i}>{b}</p>
            ) : (
              <ul key={i} className="list-disc pl-6 space-y-1">
                {b.list.map((li, j) => (
                  <li key={j}>{li}</li>
                ))}
              </ul>
            )
          )}
        </section>
      ))}
    </div>
  );
}
