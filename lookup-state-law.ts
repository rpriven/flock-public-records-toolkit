#!/usr/bin/env bun

/**
 * Quick State Public Records Law Lookup
 *
 * Fast command-line tool to get the correct legal citation for your state.
 * Usage: bun lookup-state-law.ts <STATE_CODE>
 * Example: bun lookup-state-law.ts CO
 */

import { STATE_LAWS, STATE_CODES } from "./letter";

// State law data lives in state-laws.json, shared with the generator and
// the browser app. To add a state, edit that file.

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  State Public Records Law Quick Reference                    ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  console.log("Usage: bun lookup-state-law.ts <STATE_CODE>\n");
  console.log("Example: bun lookup-state-law.ts CO\n");
  console.log("Available states:");
  STATE_CODES.forEach(code => {
    const law = STATE_LAWS[code];
    console.log(`  ${code.padEnd(4)} - ${law.name}`);
  });
  console.log("\nTo list all states with full details:");
  console.log("  bun lookup-state-law.ts --all\n");
  process.exit(0);
}

// Handle --all flag
if (args[0] === '--all' || args[0] === '-a') {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  All State Public Records Laws                               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  STATE_CODES.forEach(code => {
    const law = STATE_LAWS[code];
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`${code} - ${law.name}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Law Name:       ${law.lawName}`);
    console.log(`Statute:        ${law.statute}`);
    console.log(`Response Time:  ${law.responseTime}`);
    if (law.specificTimeframe) {
      console.log(`Deadline:       ${law.specificTimeframe} days`);
    }
    console.log(`Notes:          ${law.notes}`);
    console.log();
  });

  process.exit(0);
}

// Handle state lookup
const stateCode = args[0].trim().toUpperCase();

if (!STATE_LAWS[stateCode]) {
  console.error(`\n❌ Error: State code "${stateCode}" not found.\n`);
  console.error("Available states:");
  STATE_CODES.forEach(code => {
    console.error(`  ${code} - ${STATE_LAWS[code].name}`);
  });
  console.error("\n");
  process.exit(1);
}

const law = STATE_LAWS[stateCode];

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log(`║  ${law.name.padEnd(60)}║`);
console.log("╚══════════════════════════════════════════════════════════════╝\n");

console.log("📖 Official Law Name:");
console.log(`   ${law.lawName}\n`);

console.log("📋 Statute Citation:");
console.log(`   ${law.statute}\n`);

console.log("⏱️  Response Timeframe:");
console.log(`   ${law.responseTime}\n`);

if (law.specificTimeframe) {
  console.log("📅 Deadline:");
  console.log(`   ${law.specificTimeframe} ${law.specificTimeframe === 1 ? 'day' : 'days'}\n`);
}

console.log("📝 Notes:");
console.log(`   ${law.notes}\n`);

console.log("💡 How to Use in Your Request:");
console.log(`   "This is a non-commercial public records request made pursuant`);
console.log(`   to the ${law.lawName} (${law.statute})."`);
console.log();
console.log(`   "I request that you respond ${law.responseTime}."`);
console.log();

console.log("🔗 Related Tools:");
console.log("   • Full request generator: bun generate-flock-request.ts");
console.log("   • Template file: flock_request_template.md");
console.log("   • All states: bun lookup-state-law.ts --all\n");
