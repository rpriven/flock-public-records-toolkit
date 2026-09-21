/**
 * Shared letter logic for the Flock Safety public records request toolkit.
 *
 * Used by both the command-line generator (generate-flock-request.ts) and
 * the browser app (web/app.ts, bundled into index.html). Keeping the letter
 * text and the validators here means the two never drift apart.
 *
 * No I/O, no globals: everything is a pure function of its inputs.
 */

import STATE_LAWS_JSON from './state-laws.json';

export interface StateLaw {
  name: string;
  lawName: string;
  statute: string;
  responseTime: string;
  specificTimeframe: number | null;
  notes: string;
}

export const STATE_LAWS: Record<string, StateLaw> = STATE_LAWS_JSON;

export const STATE_CODES: string[] = Object.keys(STATE_LAWS).sort();

export function getStateLaw(code: string): StateLaw | undefined {
  return STATE_LAWS[normalizeStateCode(code)];
}

// ---------------------------------------------------------------------------
// Validation and sanitization
// ---------------------------------------------------------------------------

/** Remove control characters, trim, and cap length. */
export function sanitizeText(input: string, maxLength: number = 200): string {
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '')
    .slice(0, maxLength);
}

/** Only alphanumerics, spaces, hyphens and underscores survive; spaces become underscores. */
export function sanitizeFilename(input: string): string {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 50);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 100;
}

/** US ZIP: 12345 or 12345-6789. */
export function isValidZip(zip: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zip.trim());
}

export function normalizeStateCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
}

export function sanitizeLicensePlate(plate: string): string {
  return plate
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s\-]/g, '')
    .slice(0, 20);
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** "September 20, 2026" style date. */
export function formatLetterDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export const DEFAULT_DATE_RANGE = 'the 30 days preceding the processing of this request';

/** Flock's default rolling retention window, in days. */
export const DEFAULT_RETENTION_DAYS = 30;

/**
 * States whose law caps ALPR retention below Flock's default.
 * WA: Driver Privacy Act (SB 6002, effective March 2026) caps retention at 21 days.
 */
export const RETENTION_DAYS: Record<string, number> = {
  WA: 21,
};

/**
 * Add N business days (Monday to Friday) to a date. Holidays are NOT
 * excluded, so treat the result as an estimate, not a legal deadline.
 */
export function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return d;
}

// ---------------------------------------------------------------------------
// The letter
// ---------------------------------------------------------------------------

export interface LetterParams {
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
}

/** Build the optional item 13 (own-vehicle data) paragraph. */
export function buildVehicleInfo(licensePlate: string, vehicleDesc: string, dateRange: string): string {
  const range = dateRange || DEFAULT_DATE_RANGE;
  return `\n\n13. Vehicle-Specific Request: All images, footage, and associated data for license plate ${licensePlate} (${vehicleDesc}) for the period of ${range}. This is a request for my own vehicle data.`;
}

/**
 * Render the request letter as plain text. All params are expected to be
 * sanitized before they reach this function.
 */
export function generateLetter(params: LetterParams): string {
  const expeditedText = params.expedited ? `

⚠️ TIME-SENSITIVE REQUEST: Due to Flock Safety's 30-day default rolling data deletion policy (shorter where state law requires), I request expedited processing of this request to preserve any relevant data that may be automatically deleted during processing.` : '';

  return `${params.date}

${params.agencyName}
${params.agencyAddress}
${params.city}, ${params.state} ${params.zip}

RE: Public Records Request - Flock Safety System

Dear Public Records Custodian:

This is a non-commercial public records request made pursuant to the ${params.lawName} (${params.statute}).

I am requesting all records related to ${params.agencyName}'s relationship with Flock Group, Inc. (aka Flock Safety, including all subsidiaries), including:

1. Contracts & Agreements: All contracts, amendments, intergovernmental agreements, and related documents between ${params.agencyName} and Flock Safety or any third parties regarding Flock products/services

2. Financial Records: Purchase orders, invoices, billing records, budgets, RFPs, bid responses, cost-benefit analyses, and funding sources (including grants)

3. Policies & Procedures: All policies, guidelines, procedures, or protocols (draft or final) regarding installation, operation, monitoring, data retention, data access, data sharing, or deletion

4. Data Access Records: Logs of all access requests (internal and external), data-sharing agreements, audit logs, and requests fulfilled or denied

5. Meeting Records: Minutes, agendas, notes, and presentations from meetings where Flock cameras or services were discussed

6. Legal & Compliance: Legal opinions, risk assessments, privacy impact assessments, compliance reviews, and related correspondence

7. Technical Documentation: System specifications, cybersecurity measures, data storage locations, interoperability documentation, and breach notifications

8. Data Retention: Policies on retention timeframes, deletion procedures, and actual deletion logs

9. Training Materials: Manuals, training materials, installation records, photographs, videos, and communications (emails, notes, etc.)

10. Network Sharing & External Access: A list of all agencies and organizations with which ${params.agencyName} shares ALPR data or hot list information, and from which it receives them, including the Flock network share settings ("networks shared with me" and "networks I am sharing") and any exported list of shared networks

11. Search Audit Logs: All search audit logs, reports, or exports — including but not limited to the Flock "Organization Audit," "Network Audit," and "Event Log" reports (or successor/equivalent reports) — for the most recent three complete months, including all available fields (searching user and organization, networks and devices searched, license plate, stated reason, case number, filters, and search date/time)

12. Federal & External Sharing Agreements: All agreements, MOUs, pilot programs, or other arrangements granting any federal agency (including DHS, CBP, or ICE) or out-of-state agency access to ALPR data, and records showing the current status of any national lookup or federal sharing settings${params.vehicleInfo}${expeditedText}

Please provide records in their original electronic, machine-readable format (e.g., CSV or spreadsheet files) where applicable. Records maintained by Flock Safety on ${params.agencyName}'s behalf are responsive to this request in whatever format they are maintained. Please preserve all records responsive to this request upon receipt. If any portions of this request are denied, please provide a written explanation citing the specific legal exemption claimed.

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
