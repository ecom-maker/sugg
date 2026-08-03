// Canonical Terms & Conditions for College profile activation on Sugg.
// Rendered on the /college/terms page and referenced from the acceptance popup.
// Keep TERMS_VERSION in sync if the wording is materially changed.

export const TERMS_VERSION = "1.0";
export const TERMS_TITLE = "Terms and Conditions for College Profile Activation";

type Block = string | { list: string[] };
interface Section {
  n: string;
  heading: string;
  blocks: Block[];
}

const INTRO =
  'These Terms and Conditions ("Terms") govern the activation and use of a College’s profile on the Sugg admission management platform, operated by Daksh Bio Dynamics, a company having its registered office at 4 / 347, Kuzhalmannam, Palakkad, Kerala, India ("Sugg", "we", "us", or "our"), by the educational institution activating a profile on the Portal ("College", "you", or "your"). These Terms are accepted electronically by clicking the "I Accept" button (or any similarly worded acceptance button) after signing in to the College’s account on the Portal. If the College does not agree to these Terms, it must not click "I Accept" and must not activate a profile or use the Portal.';

const SECTIONS: Section[] = [
  {
    n: "1",
    heading: "Definitions",
    blocks: [
      '"Portal" means the Sugg website, web application, mobile application, dashboard, and any related services through which the College lists, manages, and promotes its courses, fees, seats, and admissions.',
      '"College Content" means all information, data, text, images, logos, brochures, course details, fee structures, eligibility criteria, accreditation details, and any other material uploaded, entered, or maintained by the College on the Portal.',
      '"Agency/Counselor" means any admission counselor, education consultant, or agency that uses the Portal to view College Content and refer or assist prospective students.',
      '"Commission" means the referral, service, or facilitation fee payable by the College to Sugg and/or to Agencies as agreed under the applicable commercial/partnership agreement or as displayed on the Portal from time to time.',
      '"Student" means any prospective or enrolled student who views College Content or applies to the College through the Portal.',
      '"Authorized User" means any individual who signs in to or accesses the College’s account on the Portal using the login credentials associated with that account, whether or not that individual is a director, officer, employee, owner, or other agent of the College.',
    ],
  },
  {
    n: "2",
    heading: "Acceptance of Terms and Profile Activation",
    blocks: [
      '2.1. These Terms are accepted electronically. By signing in to the College’s account on the Portal and clicking "I Accept", the Authorized User performing that action confirms, and the College agrees, that such click constitutes valid, binding, and irrevocable acceptance of these Terms by the College, with the same legal effect as if these Terms had been signed in physical form by an authorized representative of the College.',
      "2.2. The College acknowledges and agrees that any Authorized User who signs in to the College’s account and clicks \"I Accept\" shall be deemed to have the actual, implied, or apparent authority to bind the College to these Terms. The College is solely responsible for controlling and safeguarding access to its login credentials and Portal account, and Sugg shall not be liable for any acceptance, submission, or action taken by any Authorized User who accesses the College’s account, regardless of whether such access was in fact authorized by the College.",
      "2.3. The College shall not challenge or dispute the validity, binding nature, or enforceability of these Terms on the ground that the particular Authorized User who clicked \"I Accept\" lacked specific individual authority to bind the College, or on the ground that acceptance was given electronically rather than by physical or wet-ink signature. Electronic acceptance under this Clause 2 is valid and enforceable to the fullest extent permitted under applicable law, including the Information Technology Act, 2000 (India) and equivalent electronic contracting laws.",
      "2.4. These Terms apply in addition to, and do not override, any separate commercial, partnership, or subscription agreement executed between the College and Sugg. In the event of a conflict, the specific commercial agreement shall prevail only in respect of the matters it expressly addresses (such as commission rates and payment schedules); these Terms shall govern all other matters.",
    ],
  },
  {
    n: "3",
    heading: "College Responsibility for Accuracy of Information",
    blocks: [
      "3.1. The College is solely and entirely responsible for the accuracy, completeness, legality, and currency of all College Content uploaded or maintained on the Portal, including but not limited to:",
      {
        list: [
          "Course names, duration, curriculum, intake capacity, and eligibility criteria;",
          "Tuition fees, application fees, hostel/other charges, payment schedules, and refund policies;",
          "Accreditation, affiliation, recognition, and regulatory approval status (including UGC, AICTE, state, or other applicable regulatory bodies);",
          "Admission deadlines, scholarship details, placement statistics, and any claims regarding outcomes;",
          "Commission structures, payout terms, and any incentives offered to Agencies through the Portal.",
        ],
      },
      "3.2. By accepting these Terms, the College expressly agrees that Sugg does not independently verify, audit, or certify the accuracy of any College Content and is not obligated to do so. The Portal functions solely as a facilitation and listing platform. Sugg shall not be held responsible or liable, in any manner whatsoever, for any incorrect, outdated, misleading, or incomplete information appearing in the College’s courses, fees, commission structure, or profile.",
      "3.3. Any loss, dispute, complaint, refund claim, regulatory action, or reputational harm arising from inaccurate or outdated College Content shall be the sole and exclusive responsibility of the College, and the College shall indemnify Sugg in accordance with Clause 8 below.",
    ],
  },
  {
    n: "4",
    heading: "Obligation to Maintain and Update Information",
    blocks: [
      "4.1. The College agrees to promptly and diligently update its courses, fee structures, commission rates, seat availability, and all other College Content on the Portal as and when any change occurs, and in any event without undue delay.",
      "4.2. The College acknowledges that Students and Agencies rely on the information displayed on the Portal to make admission and referral decisions, and that failure to keep such information current may mislead Students or Agencies. The College bears full responsibility for any consequence arising from its failure to update the Portal in a timely manner.",
      "4.3. Sugg reserves the right, but not the obligation, to request supporting documentation from the College to substantiate any information published, and to flag, suspend, or remove listings that appear inaccurate, outdated, or unverifiable, without incurring any liability to the College for doing so.",
    ],
  },
  {
    n: "5",
    heading: "Commission and Payment Terms",
    blocks: [
      "5.1. The College agrees to pay Sugg and/or the referring Agency the Commission applicable to successful admissions or referrals made through the Portal, as set out in the College’s commercial/partnership agreement with Sugg or as displayed on the Portal at the time of activation.",
      "5.2. The College is responsible for accurately configuring and maintaining its commission structure on the Portal. Sugg shall not be liable for any shortfall, overpayment, dispute, or claim by an Agency arising from an incorrect or outdated commission configuration by the College.",
      "5.3. Commission amounts, payment cycles, and invoicing procedures may be updated by Sugg from time to time with prior notice to the College, and continued use of the Portal after such notice constitutes acceptance of the updated terms.",
    ],
  },
  {
    n: "6",
    heading: "Sugg’s Role, Disclaimer, and No Warranty",
    blocks: [
      "6.1. Sugg acts solely as a technology platform and facilitator connecting Colleges, Agencies, and Students. Sugg is not a party to, and assumes no responsibility for, the admission process, contractual relationship, or any transaction between the College and any Student or Agency.",
      '6.2. THE PORTAL AND ALL COLLEGE CONTENT ARE PROVIDED "AS IS" AND "AS AVAILABLE". SUGG EXPRESSLY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS OR IMPLIED, REGARDING THE ACCURACY, RELIABILITY, COMPLETENESS, OR FITNESS FOR PURPOSE OF ANY COLLEGE CONTENT, INCLUDING COURSE DETAILS, FEES, ACCREDITATION STATUS, OR COMMISSION TERMS.',
      "6.3. Sugg does not guarantee any specific number of leads, applications, admissions, or enrollments to the College, nor does it guarantee the accuracy of information supplied by Students or Agencies.",
    ],
  },
  {
    n: "7",
    heading: "Compliance with Applicable Laws and Regulatory Approvals",
    blocks: [
      "7.1. The College represents and warrants that it holds all necessary licenses, accreditations, affiliations, and regulatory approvals required to lawfully offer the courses listed on the Portal, and that such approvals are current and valid for the duration the profile remains active.",
      "7.2. The College shall comply with all applicable laws, including consumer protection, advertising, education regulatory, and data protection laws, in respect of all College Content and all communications with Students and Agencies made through or facilitated by the Portal.",
      "7.3. The College shall not upload or publish any false, misleading, defamatory, or unlawful content, or any content that infringes the intellectual property or other rights of any third party.",
    ],
  },
  {
    n: "8",
    heading: "Indemnification",
    blocks: [
      "8.1. The College shall defend, indemnify, and hold harmless Sugg, its affiliates, directors, officers, employees, and agents from and against any and all claims, demands, losses, damages, liabilities, penalties, fines, costs, and expenses (including reasonable legal fees) arising out of or in connection with:",
      {
        list: [
          "Any inaccurate, incomplete, outdated, or misleading College Content, including course details, fees, or commission structures;",
          "Any dispute, refund claim, or complaint raised by a Student or Agency in connection with the College’s courses, admissions, fees, or conduct;",
          "The College’s breach of these Terms, applicable law, or any representation or warranty made herein;",
          "Any regulatory action, penalty, or investigation arising from the College’s lack of, or lapse in, required accreditation or approval;",
          "Any infringement of third-party intellectual property or other rights arising from College Content.",
        ],
      },
      "8.2. This indemnification obligation shall survive the termination or expiry of the College’s profile activation and use of the Portal.",
    ],
  },
  {
    n: "9",
    heading: "Limitation of Liability",
    blocks: [
      "9.1. To the maximum extent permitted by applicable law, Sugg’s total aggregate liability to the College arising out of or in connection with the Portal or these Terms, whether in contract, tort, or otherwise, shall not exceed the total Commission or platform fees actually paid by the College to Sugg in the three (3) months preceding the event giving rise to the claim.",
      "9.2. In no event shall Sugg be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, loss of reputation, or loss of data, arising from the College’s use of the Portal or reliance on College Content published by the College itself.",
    ],
  },
  {
    n: "10",
    heading: "Content License and Intellectual Property",
    blocks: [
      "10.1. The College grants Sugg a non-exclusive, royalty-free, worldwide license to host, display, reproduce, and distribute College Content on the Portal and in related marketing materials, solely for the purpose of operating and promoting the Portal.",
      "10.2. The College represents that it owns or has the necessary rights to all College Content it uploads, including logos, images, and brochures, and that such content does not infringe any third-party rights.",
      "10.3. All trademarks, logos, software, and other intellectual property comprising the Portal remain the exclusive property of Sugg. Nothing in these Terms transfers any such rights to the College.",
    ],
  },
  {
    n: "11",
    heading: "Student and Agency Disputes; Admissions",
    blocks: [
      "11.1. All decisions relating to admission, rejection, waitlisting, fee collection, and refunds are made solely by the College. Sugg has no role in, and assumes no responsibility for, such decisions.",
      "11.2. Any dispute between the College and a Student or Agency, including disputes relating to fees, refunds, admission outcomes, or course delivery, shall be resolved directly between the College and such Student or Agency, and the College shall not involve Sugg as a party to any such dispute or proceeding.",
    ],
  },
  {
    n: "12",
    heading: "Data Protection and Privacy",
    blocks: [
      "12.1. The College is responsible for ensuring it has a lawful basis to collect, process, and share any Student or Agency personal data obtained through the Portal, and for complying with all applicable data protection laws in respect of such data.",
      "12.2. The College shall not use Student or Agency data obtained through the Portal for any purpose other than legitimate admission-related communication, and shall not sell, rent, or share such data with unauthorized third parties.",
    ],
  },
  {
    n: "13",
    heading: "Confidentiality",
    blocks: [
      "The College shall keep confidential any non-public information relating to Sugg’s business, pricing, technology, or platform features that it becomes aware of through its use of the Portal, and shall not disclose such information to any third party without Sugg’s prior written consent.",
    ],
  },
  {
    n: "14",
    heading: "Suspension and Termination",
    blocks: [
      "14.1. Sugg reserves the right to suspend or deactivate the College’s profile, with or without prior notice, if the College is found to have published false, misleading, or unverifiable information, breached these Terms, failed to pay Commission when due, or engaged in conduct harmful to Students, Agencies, or the Portal’s integrity.",
      "14.2. The College may deactivate its profile at any time by providing written notice to Sugg. Deactivation does not relieve the College of any Commission, indemnification, or other obligations accrued prior to the effective date of deactivation.",
    ],
  },
  {
    n: "15",
    heading: "Non-Exclusivity",
    blocks: [
      "Unless otherwise agreed in a separate written agreement, the College’s use of the Portal is non-exclusive, and both the College and Sugg remain free to enter into similar arrangements with other parties.",
    ],
  },
  {
    n: "16",
    heading: "Force Majeure",
    blocks: [
      "Sugg shall not be liable for any failure or delay in performance under these Terms resulting from causes beyond its reasonable control, including natural disasters, internet or telecommunications failures, government action, or other events of force majeure.",
    ],
  },
  {
    n: "17",
    heading: "Amendment of Terms",
    blocks: [
      "Sugg may revise these Terms from time to time by posting the updated Terms on the Portal. Continued use of the Portal or maintenance of an active College profile after such changes take effect constitutes the College’s acceptance of the revised Terms.",
    ],
  },
  {
    n: "18",
    heading: "Governing Law and Dispute Resolution",
    blocks: [
      "18.1. These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles.",
      "18.2. Subject to Clause 18.3, the courts at Palakkad, India shall have exclusive jurisdiction over any dispute arising out of or in connection with these Terms.",
      "18.3. Any dispute, controversy, or claim arising out of or relating to these Terms shall first be referred to arbitration under the Arbitration and Conciliation Act, 1996, to be conducted by a sole arbitrator appointed by Sugg, with the seat and venue of arbitration at Palakkad, India, and the proceedings conducted in English.",
    ],
  },
  {
    n: "19",
    heading: "Notices",
    blocks: [
      "All notices under these Terms shall be sent in writing to the College’s registered email address on the Portal, and to Sugg at sudeepa@sugg.in. Notices shall be deemed delivered upon transmission if sent by email.",
    ],
  },
  {
    n: "20",
    heading: "Entire Agreement; Severability; Waiver",
    blocks: [
      "20.1. These Terms, together with any applicable commercial/partnership agreement, constitute the entire agreement between the College and Sugg regarding profile activation and use of the Portal, and supersede all prior discussions or understandings on the subject.",
      "20.2. If any provision of these Terms is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.",
      "20.3. No failure or delay by Sugg in exercising any right under these Terms shall operate as a waiver of that right.",
    ],
  },
  {
    n: "21",
    heading: "Electronic Acceptance",
    blocks: [
      '21.1. By signing in to its account on the Portal and clicking "I Accept", the College confirms that it has read, understood, and agrees to be bound by these Terms and Conditions, and specifically acknowledges and accepts sole responsibility for the accuracy of its courses, fees, and commission details, and that Sugg bears no responsibility or liability for any incorrect information appearing in the College’s profile.',
      '21.2. Sugg shall maintain a record of each acceptance of these Terms, including the date, time, College account, and the Authorized User action of clicking "I Accept". This record shall constitute conclusive evidence of the College’s acceptance of these Terms and of the date on which such acceptance took effect.',
      "21.3. No physical or wet-ink signature is required for these Terms to be valid and binding. The College may request a countersigned copy of these Terms for its internal records; provision of such a copy shall not affect the validity or effective date of the electronic acceptance recorded under Clause 21.2.",
    ],
  },
];

export function CollegeTermsContent() {
  return (
    <div className="text-sm leading-relaxed text-foreground/90 space-y-5">
      <div className="space-y-1">
        <p className="font-semibold uppercase tracking-wide text-foreground">
          Terms and Conditions for College Profile Activation
        </p>
        <p className="font-medium text-muted-foreground">
          On the Sugg Admission Management Platform (&ldquo;Terms&rdquo;)
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
