#!/usr/bin/env bun

/**
 * Quick State Public Records Law Lookup
 *
 * Fast command-line tool to get the correct legal citation for your state.
 * Usage: bun lookup-state-law.ts <STATE_CODE>
 * Example: bun lookup-state-law.ts CO
 */

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
};

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  State Public Records Law Quick Reference                   ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  console.log("Usage: bun lookup-state-law.ts <STATE_CODE>\n");
  console.log("Example: bun lookup-state-law.ts CO\n");
  console.log("Available states:");
  Object.keys(STATE_LAWS).sort().forEach(code => {
    const law = STATE_LAWS[code as keyof typeof STATE_LAWS];
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

  Object.keys(STATE_LAWS).sort().forEach(code => {
    const law = STATE_LAWS[code as keyof typeof STATE_LAWS];
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

if (!STATE_LAWS[stateCode as keyof typeof STATE_LAWS]) {
  console.error(`\n❌ Error: State code "${stateCode}" not found.\n`);
  console.error("Available states:");
  Object.keys(STATE_LAWS).sort().forEach(code => {
    console.error(`  ${code} - ${STATE_LAWS[code as keyof typeof STATE_LAWS].name}`);
  });
  console.error("\n");
  process.exit(1);
}

const law = STATE_LAWS[stateCode as keyof typeof STATE_LAWS];

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log(`║  ${law.name.padEnd(58)} ║`);
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
