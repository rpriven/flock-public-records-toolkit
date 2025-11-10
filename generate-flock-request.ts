#!/usr/bin/env bun

/**
 * Flock Safety Public Records Request Generator (Security Hardened)
 *
 * Interactive script to generate properly formatted public records requests
 * for Flock Safety camera systems with correct state-specific legal citations.
 *
 * Security Features:
 * - Input validation and sanitization
 * - Path traversal prevention
 * - Length limits on all inputs
 * - Email format validation
 * - Safe filename generation
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

// State-specific public records law information
const STATE_LAWS = {
  AZ: {
    name: "Arizona",
    lawName: "Arizona Public Records Law",
    statute: "A.R.S. §39-121 et seq.",
    responseTime: "promptly as required by A.R.S. §39-121",
    specificTimeframe: null,
    notes: "Arizona does not have a specific mandated response time in days"
  },
  CO: {
    name: "Colorado",
    lawName: "Colorado Open Records Act (CORA)",
    statute: "C.R.S. §24-72-201 et seq.",
    responseTime: "within 10 business days as required by C.R.S. §24-72-203(3)(b)",
    specificTimeframe: 10,
    notes: "Colorado allows 10 business days for response"
  },
  CA: {
    name: "California",
    lawName: "California Public Records Act",
    statute: "Cal. Gov. Code §7920.000 et seq.",
    responseTime: "within 10 days as required by Cal. Gov. Code §7922.535",
    specificTimeframe: 10,
    notes: "California requires response within 10 days"
  },
  TX: {
    name: "Texas",
    lawName: "Texas Public Information Act",
    statute: "Tex. Gov't Code §552.001 et seq.",
    responseTime: "promptly as required by Tex. Gov't Code §552.221",
    specificTimeframe: 10,
    notes: "Texas requires response within 10 business days"
  },
  IL: {
    name: "Illinois",
    lawName: "Illinois Freedom of Information Act (FOIA)",
    statute: "5 ILCS 140/1 et seq.",
    responseTime: "within 5 business days as required by 5 ILCS 140/3(d)",
    specificTimeframe: 5,
    notes: "Illinois requires response within 5 business days"
  },
  VA: {
    name: "Virginia",
    lawName: "Virginia Freedom of Information Act (FOIA)",
    statute: "Va. Code §2.2-3700 et seq.",
    responseTime: "within 5 working days as required by Va. Code §2.2-3704(B)",
    specificTimeframe: 5,
    notes: "Virginia requires response within 5 working days"
  },
  NY: {
    name: "New York",
    lawName: "New York Freedom of Information Law (FOIL)",
    statute: "N.Y. Pub. Off. Law §87 et seq.",
    responseTime: "within 5 business days as required by N.Y. Pub. Off. Law §89(3)",
    specificTimeframe: 5,
    notes: "New York requires acknowledgment within 5 business days"
  },
  FL: {
    name: "Florida",
    lawName: "Florida Public Records Law",
    statute: "Fla. Stat. §119.01 et seq.",
    responseTime: "within a reasonable time as required by Fla. Stat. §119.07(1)(a)",
    specificTimeframe: null,
    notes: "Florida requires 'reasonable time' - no specific deadline"
  },
  WA: {
    name: "Washington",
    lawName: "Washington Public Records Act",
    statute: "RCW 42.56 et seq.",
    responseTime: "within 5 business days as required by RCW 42.56.520",
    specificTimeframe: 5,
    notes: "Washington requires response within 5 business days"
  },
  OR: {
    name: "Oregon",
    lawName: "Oregon Public Records Law",
    statute: "ORS 192.311 et seq.",
    responseTime: "within a reasonable time as required by ORS 192.329",
    specificTimeframe: null,
    notes: "Oregon requires 'reasonable time' - no specific deadline"
  },
  GA: {
    name: "Georgia",
    lawName: "Georgia Open Records Act",
    statute: "O.C.G.A. §50-18-70 et seq.",
    responseTime: "within 3 business days as required by O.C.G.A. §50-18-71(b)(1)",
    specificTimeframe: 3,
    notes: "Georgia requires response within 3 business days"
  },
  NC: {
    name: "North Carolina",
    lawName: "North Carolina Public Records Law",
    statute: "N.C. Gen. Stat. §132-1 et seq.",
    responseTime: "within a reasonable time as required by N.C. Gen. Stat. §132-6",
    specificTimeframe: null,
    notes: "North Carolina requires 'reasonable time' - no specific deadline"
  },
  TN: {
    name: "Tennessee",
    lawName: "Tennessee Public Records Act",
    statute: "Tenn. Code Ann. §10-7-503 et seq.",
    responseTime: "within 7 business days as required by Tenn. Code Ann. §10-7-503(a)(2)(B)",
    specificTimeframe: 7,
    notes: "Tennessee requires response within 7 business days"
  },
  MA: {
    name: "Massachusetts",
    lawName: "Massachusetts Public Records Law",
    statute: "Mass. Gen. Laws ch. 66, §10 et seq.",
    responseTime: "within 10 business days as required by Mass. Gen. Laws ch. 66, §10(b)",
    specificTimeframe: 10,
    notes: "Massachusetts requires response within 10 business days"
  },
  PA: {
    name: "Pennsylvania",
    lawName: "Pennsylvania Right-to-Know Law",
    statute: "65 Pa.C.S. §67.101 et seq.",
    responseTime: "within 5 business days as required by 65 Pa.C.S. §67.901",
    specificTimeframe: 5,
    notes: "Pennsylvania requires response within 5 business days"
  },
  OH: {
    name: "Ohio",
    lawName: "Ohio Public Records Act",
    statute: "Ohio Rev. Code §149.43 et seq.",
    responseTime: "within a reasonable time as required by Ohio Rev. Code §149.43(B)",
    specificTimeframe: null,
    notes: "Ohio requires 'reasonable time' - no specific deadline"
  },
  MI: {
    name: "Michigan",
    lawName: "Michigan Freedom of Information Act (FOIA)",
    statute: "MCL 15.231 et seq.",
    responseTime: "within 15 business days as required by MCL 15.235(2)",
    specificTimeframe: 15,
    notes: "Michigan requires response within 15 business days"
  },
  MD: {
    name: "Maryland",
    lawName: "Maryland Public Information Act",
    statute: "Md. Code Ann., Gen. Prov. §4-101 et seq.",
    responseTime: "within 30 days as required by Md. Code Ann., Gen. Prov. §4-203(c)",
    specificTimeframe: 30,
    notes: "Maryland requires response within 30 days"
  },
  NV: {
    name: "Nevada",
    lawName: "Nevada Public Records Law",
    statute: "Nev. Rev. Stat. §239.010 et seq.",
    responseTime: "within 5 business days as required by Nev. Rev. Stat. §239.0107",
    specificTimeframe: 5,
    notes: "Nevada requires response within 5 business days"
  },
  NM: {
    name: "New Mexico",
    lawName: "New Mexico Inspection of Public Records Act",
    statute: "NMSA 1978, §14-2-1 et seq.",
    responseTime: "within 3 business days as required by NMSA 1978, §14-2-8(D)",
    specificTimeframe: 3,
    notes: "New Mexico requires response within 3 business days"
  },
  // Add more states as needed
};

// Security: Input validation and sanitization functions

/**
 * Sanitize text input - removes control characters, limits length
 */
function sanitizeText(input: string, maxLength: number = 200): string {
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .slice(0, maxLength); // Enforce length limit
}

/**
 * Sanitize filename - only allow safe characters
 */
function sanitizeFilename(input: string): string {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Only alphanumeric, spaces, hyphens, underscores
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Collapse multiple underscores
    .slice(0, 50); // Limit filename length
}

/**
 * Validate email format (basic check)
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 100;
}

/**
 * Validate ZIP code (US format)
 */
function isValidZip(zip: string): boolean {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip.trim());
}

/**
 * Validate state code (2 letters)
 */
function normalizeStateCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
}

/**
 * Validate license plate (alphanumeric, hyphens, spaces)
 */
function sanitizeLicensePlate(plate: string): string {
  return plate
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s\-]/g, '')
    .slice(0, 20);
}

// Helper function to read input from user
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Helper function to get current date in format: Month Day, Year
function getCurrentDate(): string {
  const date = new Date();
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Main interactive function
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Flock Safety Public Records Request Generator              ║");
  console.log("║  Generates state-specific public records requests           ║");
  console.log("║  (Security Hardened Version)                                 ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Get state
  console.log("\nAvailable states:");
  Object.keys(STATE_LAWS).sort().forEach(code => {
    console.log(`  ${code} - ${STATE_LAWS[code as keyof typeof STATE_LAWS].name}`);
  });

  const rawStateCode = await prompt("\nEnter your state code (e.g., AZ, CO, CA): ");
  const stateCode = normalizeStateCode(rawStateCode);

  if (!STATE_LAWS[stateCode as keyof typeof STATE_LAWS]) {
    console.error(`\n❌ Error: State code "${stateCode}" not found in database.`);
    console.error("Please add your state's information to the STATE_LAWS object in the script,");
    console.error("or use the generic template in foia_request_streamlined.md\n");
    process.exit(1);
  }

  const stateLaw = STATE_LAWS[stateCode as keyof typeof STATE_LAWS];

  // Get agency information
  console.log("\n─────────────────────────────────────────────────────────────");
  console.log("Agency Information");
  console.log("─────────────────────────────────────────────────────────────");

  const agencyName = sanitizeText(await prompt("Agency name (e.g., Denver Police Department): "), 200);
  if (!agencyName) {
    console.error("❌ Error: Agency name is required");
    process.exit(1);
  }

  const agencyAddress = sanitizeText(await prompt("Agency street address: "), 200);
  const city = sanitizeText(await prompt("City: "), 100);
  const rawZip = await prompt("ZIP code: ");

  if (!isValidZip(rawZip)) {
    console.error("❌ Error: Invalid ZIP code format (use 12345 or 12345-6789)");
    process.exit(1);
  }
  const zip = rawZip.trim();

  // Get requester information
  console.log("\n─────────────────────────────────────────────────────────────");
  console.log("Your Information");
  console.log("─────────────────────────────────────────────────────────────");

  const yourName = sanitizeText(await prompt("Your full name: "), 100);
  if (!yourName) {
    console.error("❌ Error: Your name is required");
    process.exit(1);
  }

  const yourAddress = sanitizeText(await prompt("Your street address: "), 200);
  const yourCity = sanitizeText(await prompt("Your city: "), 100);
  const yourState = sanitizeText(await prompt("Your state: "), 50);

  const rawYourZip = await prompt("Your ZIP: ");
  if (!isValidZip(rawYourZip)) {
    console.error("❌ Error: Invalid ZIP code format");
    process.exit(1);
  }
  const yourZip = rawYourZip.trim();

  const rawEmail = await prompt("Your email: ");
  if (!isValidEmail(rawEmail)) {
    console.error("❌ Error: Invalid email format");
    process.exit(1);
  }
  const yourEmail = rawEmail.trim();

  const yourPhone = sanitizeText(await prompt("Your phone (optional): "), 20);

  // Ask about specific requests
  console.log("\n─────────────────────────────────────────────────────────────");
  console.log("Request Customization");
  console.log("─────────────────────────────────────────────────────────────");

  const includeFootage = await prompt("Request your own vehicle footage? (y/n): ");
  let vehicleInfo = "";

  if (includeFootage.toLowerCase() === 'y') {
    const rawPlate = await prompt("Your license plate number: ");
    const licensePlate = sanitizeLicensePlate(rawPlate);

    if (!licensePlate) {
      console.error("❌ Error: Invalid license plate");
      process.exit(1);
    }

    const vehicleDesc = sanitizeText(await prompt("Vehicle description (e.g., '2020 Honda Civic, blue'): "), 100);
    const dateRange = sanitizeText(await prompt("Date range (e.g., 'January 1-15, 2025'): "), 50);

    vehicleInfo = `\n\n10. **Vehicle-Specific Request**: All images, footage, and associated data for license plate ${licensePlate} (${vehicleDesc}) for the period of ${dateRange}. This is a request for my own vehicle data.`;
  }

  const expedited = await prompt("Request expedited processing due to 30-day deletion? (y/n): ");

  // Generate the letter
  const letter = generateLetter({
    date: getCurrentDate(),
    agencyName,
    agencyAddress,
    city,
    state: stateLaw.name,
    stateCode,
    zip,
    lawName: stateLaw.lawName,
    statute: stateLaw.statute,
    responseTime: stateLaw.responseTime,
    yourName,
    yourAddress,
    yourCity,
    yourState,
    yourZip,
    yourEmail,
    yourPhone,
    vehicleInfo,
    expedited: expedited.toLowerCase() === 'y'
  });

  // Security: Safe filename generation - restrict to current directory
  const safeAgencyName = sanitizeFilename(agencyName);
  const timestamp = Date.now();
  const filename = `foia_request_${safeAgencyName}_${timestamp}.txt`;

  // Security: Use path.join to ensure file stays in current directory
  const filepath = join(process.cwd(), filename);

  // Additional safety check: ensure filepath is still in current directory
  if (!filepath.startsWith(process.cwd())) {
    console.error("❌ Security Error: Invalid file path detected");
    process.exit(1);
  }

  writeFileSync(filepath, letter);

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  ✅ Request Generated Successfully!                          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`\nSaved to: ${filename}`);
  console.log("\n📋 Preview:\n");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(letter);
  console.log("─────────────────────────────────────────────────────────────");

  console.log("\n💡 Next Steps:");
  console.log("   1. Review the generated request carefully");
  console.log("   2. Verify the agency contact information");
  console.log("   3. Send via email or mail to the agency");
  console.log("   4. Keep a copy for your records");
  console.log("   5. Follow up if no response within the legal timeframe");

  if (expedited) {
    console.log("\n⚠️  IMPORTANT: You requested expedited processing due to");
    console.log("   Flock's 30-day deletion policy. Follow up quickly!");
  }

  console.log("\n");
}

function generateLetter(params: {
  date: string;
  agencyName: string;
  agencyAddress: string;
  city: string;
  state: string;
  stateCode: string;
  zip: string;
  lawName: string;
  statute: string;
  responseTime: string;
  yourName: string;
  yourAddress: string;
  yourCity: string;
  yourState: string;
  yourZip: string;
  yourEmail: string;
  yourPhone: string;
  vehicleInfo: string;
  expedited: boolean;
}): string {
  const expeditedText = params.expedited ? `

⚠️ TIME-SENSITIVE REQUEST: Due to Flock Safety's 30-day rolling data deletion policy, I request expedited processing of this request to preserve any relevant data that may be automatically deleted during processing.` : '';

  // Note: All params have already been sanitized before reaching this function
  return `${params.date}

${params.agencyName}
${params.agencyAddress}
${params.city}, ${params.state} ${params.zip}

RE: Public Records Request - Flock Safety System

Dear Public Records Custodian:

This is a non-commercial public records request made pursuant to the ${params.lawName} (${params.statute}).

I am requesting all records related to ${params.agencyName}'s relationship with Flock Group, Inc. (aka Flock Safety, including all subsidiaries), including:

1. **Contracts & Agreements**: All contracts, amendments, intergovernmental agreements, and related documents between ${params.agencyName} and Flock Safety or any third parties regarding Flock products/services

2. **Financial Records**: Purchase orders, invoices, billing records, budgets, RFPs, bid responses, cost-benefit analyses, and funding sources (including grants)

3. **Policies & Procedures**: All policies, guidelines, procedures, or protocols (draft or final) regarding installation, operation, monitoring, data retention, data access, data sharing, or deletion

4. **Data Access Records**: Logs of all access requests (internal and external), data-sharing agreements, audit logs, and requests fulfilled or denied

5. **Meeting Records**: Minutes, agendas, notes, and presentations from meetings where Flock cameras or services were discussed

6. **Legal & Compliance**: Legal opinions, risk assessments, privacy impact assessments, compliance reviews, and related correspondence

7. **Technical Documentation**: System specifications, cybersecurity measures, data storage locations, interoperability documentation, and breach notifications

8. **Data Retention**: Policies on retention timeframes, deletion procedures, and actual deletion logs

9. **Training Materials**: Manuals, training materials, installation records, photographs, videos, and communications (emails, notes, etc.)${params.vehicleInfo}${expeditedText}

Please provide records in electronic format if available. If any portions of this request are denied, please provide a written explanation citing the specific legal exemption claimed.

I request that you respond ${params.responseTime}.

Please send the requested records to:

${params.yourName}
${params.yourAddress}
${params.yourCity}, ${params.yourState} ${params.yourZip}
Email: ${params.yourEmail}${params.yourPhone ? `\nPhone: ${params.yourPhone}` : ''}

Thank you for your attention to this matter.

Sincerely,

${params.yourName}`;
}

// Run the script
main().catch(console.error);
