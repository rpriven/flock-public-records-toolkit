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

import {
  STATE_LAWS,
  STATE_CODES,
  DEFAULT_DATE_RANGE,
  buildVehicleInfo,
  formatLetterDate,
  generateLetter,
  isValidEmail,
  isValidZip,
  normalizeStateCode,
  sanitizeFilename,
  sanitizeLicensePlate,
  sanitizeText,
} from "./letter";

// State law data lives in state-laws.json and the letter text in letter.ts,
// shared with the browser app (index.html) so the two never drift apart.

// Helper function to read input from user
// Single shared interface with a line queue: per-question interfaces (and
// bare rl.question with piped stdin) drop buffered lines, breaking scripted use
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const inputQueue: string[] = [];
let pendingResolve: ((answer: string) => void) | null = null;

rl.on('line', (line) => {
  if (pendingResolve) {
    const resolve = pendingResolve;
    pendingResolve = null;
    resolve(line.trim());
  } else {
    inputQueue.push(line);
  }
});

rl.on('close', () => {
  // EOF with a question outstanding: resolve empty so validation exits cleanly
  if (pendingResolve) {
    const resolve = pendingResolve;
    pendingResolve = null;
    resolve('');
  }
});

function prompt(question: string): Promise<string> {
  process.stdout.write(question);
  return new Promise((resolve) => {
    if (inputQueue.length > 0) {
      resolve(inputQueue.shift()!.trim());
    } else {
      pendingResolve = resolve;
    }
  });
}

// Main interactive function
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Flock Safety Public Records Request Generator               ║");
  console.log("║  Generates state-specific public records requests            ║");
  console.log("║  (Security Hardened Version)                                 ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Get state
  console.log("\nAvailable states:");
  STATE_CODES.forEach(code => {
    console.log(`  ${code} - ${STATE_LAWS[code].name}`);
  });

  const rawStateCode = await prompt("\nEnter your state code (e.g., AZ, CO, CA): ");
  const stateCode = normalizeStateCode(rawStateCode);

  if (!STATE_LAWS[stateCode]) {
    console.error(`\n❌ Error: State code "${stateCode}" not found in database.`);
    console.error("Please add your state's information to state-laws.json (see README: Contributing),");
    console.error("or use the generic template in flock_request_template.md\n");
    process.exit(1);
  }

  const stateLaw = STATE_LAWS[stateCode];

  // Get agency information
  console.log("\n─────────────────────────────────────────────────────────────");
  console.log("Agency Information");
  console.log("─────────────────────────────────────────────────────────────");

  const agencyName = sanitizeText(await prompt("Agency name (e.g., Springfield Police Department): "), 200);
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
    const dateRangeInput = sanitizeText(await prompt(`Date range (press Enter for the recommended '${DEFAULT_DATE_RANGE}'): `), 80);
    vehicleInfo = buildVehicleInfo(licensePlate, vehicleDesc, dateRangeInput || DEFAULT_DATE_RANGE);
  }

  const expedited = await prompt("Request expedited processing due to 30-day deletion? (y/n): ");

  // Generate the letter
  const letter = generateLetter({
    date: formatLetterDate(),
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

// Run the script
main().catch(console.error).finally(() => rl.close());
