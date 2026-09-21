/**
 * Browser app for the Flock Safety public records request generator.
 *
 * Bundled by build-web.ts into index.html. Uses only DOM APIs: no fetch,
 * no storage, no cookies. All letter logic lives in ../letter.ts so the
 * browser and the CLI produce the same text.
 */

import {
  STATE_LAWS,
  STATE_CODES,
  DEFAULT_DATE_RANGE,
  RETENTION_DAYS,
  DEFAULT_RETENTION_DAYS,
  addBusinessDays,
  buildVehicleInfo,
  formatLetterDate,
  generateLetter,
  isValidEmail,
  isValidZip,
  sanitizeFilename,
  sanitizeLicensePlate,
  sanitizeText,
} from '../letter';

function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

const input = (id: string) => $<HTMLInputElement>(id);

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// State picker and law card
// ---------------------------------------------------------------------------

const stateSelect = $<HTMLSelectElement>('state');
for (const code of STATE_CODES) {
  const opt = document.createElement('option');
  opt.value = code;
  opt.textContent = `${STATE_LAWS[code].name} (${code})`;
  stateSelect.appendChild(opt);
}

function renderLawCard(): void {
  const code = stateSelect.value;
  const card = $('law');
  const retention = $('retention');
  if (!code) {
    card.classList.add('hidden');
    retention.classList.add('hidden');
    return;
  }
  const law = STATE_LAWS[code];
  $('law-name').textContent = law.lawName;
  $('law-statute').textContent = law.statute;
  $('law-response').textContent = law.responseTime;
  const today = new Date();
  if (law.specificTimeframe) {
    const due = addBusinessDays(today, law.specificTimeframe);
    $('law-deadline').textContent =
      `a response is due by about ${formatLongDate(due)} (${law.specificTimeframe} business days; approximate, holidays not excluded)`;
  } else {
    $('law-deadline').textContent = 'no fixed deadline in this state; the law requires a prompt or reasonable response';
  }
  $('law-notes').textContent = law.notes;
  card.classList.remove('hidden');

  const days = RETENTION_DAYS[code] ?? DEFAULT_RETENTION_DAYS;
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
  retention.textContent =
    `⏱ Flock deletes camera data after ${days} days${days !== DEFAULT_RETENTION_DAYS ? ' in this state' : ' by default'}. ` +
    `Anything captured before ${formatLongDate(cutoff)} may already be gone, so send this soon.`;
  retention.classList.remove('hidden');

  // Prefill the requester's state if they haven't typed one.
  const yourState = input('yourState');
  if (!yourState.value || yourState.dataset.auto === '1') {
    yourState.value = law.name;
    yourState.dataset.auto = '1';
  }
}

stateSelect.addEventListener('change', () => {
  renderLawCard();
  regenerateIfShown();
});
input('yourState').addEventListener('input', (e) => {
  (e.target as HTMLInputElement).dataset.auto = '0';
});

// ---------------------------------------------------------------------------
// Vehicle fields toggle
// ---------------------------------------------------------------------------

const vehicleCheck = input('vehicle');
vehicleCheck.addEventListener('change', () => {
  $('vehicle-fields').classList.toggle('hidden', !vehicleCheck.checked);
  regenerateIfShown();
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function setError(id: string, bad: boolean): void {
  const field = document.getElementById(id);
  const msg = document.getElementById(`err-${id}`);
  if (field) field.setAttribute('aria-invalid', bad ? 'true' : 'false');
  if (msg) msg.classList.toggle('show', bad);
}

function validate(): boolean {
  let ok = true;
  const check = (id: string, bad: boolean) => {
    setError(id, bad);
    if (bad) ok = false;
  };
  check('state', !stateSelect.value);
  check('agencyName', !sanitizeText(input('agencyName').value, 200));
  check('agencyZip', !isValidZip(input('agencyZip').value));
  check('yourName', !sanitizeText(input('yourName').value, 100));
  check('yourZip', !isValidZip(input('yourZip').value));
  check('yourEmail', !isValidEmail(input('yourEmail').value.trim()));
  if (vehicleCheck.checked) {
    check('plate', !sanitizeLicensePlate(input('plate').value));
  } else {
    setError('plate', false);
  }
  return ok;
}

// ---------------------------------------------------------------------------
// Letter generation
// ---------------------------------------------------------------------------

function buildLetter(): string {
  const code = stateSelect.value;
  const law = STATE_LAWS[code];
  const agencyName = sanitizeText(input('agencyName').value, 200);

  let vehicleInfo = '';
  if (vehicleCheck.checked) {
    const plate = sanitizeLicensePlate(input('plate').value);
    const desc = sanitizeText(input('vehicleDesc').value, 100);
    const range = sanitizeText(input('dateRange').value, 80) || DEFAULT_DATE_RANGE;
    vehicleInfo = buildVehicleInfo(plate, desc, range);
  }

  return generateLetter({
    date: formatLetterDate(new Date()),
    agencyName,
    agencyAddress: sanitizeText(input('agencyAddress').value, 200),
    city: sanitizeText(input('agencyCity').value, 100),
    state: law.name,
    stateCode: code,
    zip: input('agencyZip').value.trim(),
    lawName: law.lawName,
    statute: law.statute,
    responseTime: law.responseTime,
    yourName: sanitizeText(input('yourName').value, 100),
    yourAddress: sanitizeText(input('yourAddress').value, 200),
    yourCity: sanitizeText(input('yourCity').value, 100),
    yourState: sanitizeText(input('yourState').value, 50),
    yourZip: input('yourZip').value.trim(),
    yourEmail: input('yourEmail').value.trim(),
    yourPhone: sanitizeText(input('yourPhone').value, 20),
    vehicleInfo,
    expedited: input('expedited').checked,
  });
}

let shown = false;

function showLetter(): void {
  const text = buildLetter();
  $('letter').textContent = text;
  const law = STATE_LAWS[stateSelect.value];
  const next = $('next-deadline');
  if (law.specificTimeframe) {
    const due = addBusinessDays(new Date(), law.specificTimeframe);
    next.textContent = `If nothing arrives by about ${formatLongDate(due)}, follow up in writing and cite ${law.statute}.`;
  } else {
    next.textContent = `If you hear nothing within a couple of weeks, follow up in writing and cite ${law.statute}.`;
  }
  $('output').classList.add('show');
  shown = true;
}

function regenerateIfShown(): void {
  if (!shown) return;
  if (validate()) {
    showLetter();
    setStatus('');
  }
}

const form = $<HTMLFormElement>('form');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validate()) {
    const firstBad = form.querySelector<HTMLElement>('[aria-invalid="true"]');
    firstBad?.focus();
    return;
  }
  showLetter();
  setStatus('');
  $('output').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Live-update the letter once it has been shown, so edits are reflected.
form.addEventListener('input', () => regenerateIfShown());

// ---------------------------------------------------------------------------
// Copy / download / print
// ---------------------------------------------------------------------------

function setStatus(msg: string): void {
  $('status').textContent = msg;
}

function letterText(): string {
  return $('letter').textContent ?? '';
}

function downloadName(): string {
  const agency = sanitizeFilename(input('agencyName').value) || 'agency';
  return `records_request_${agency}.txt`;
}

$('copy').addEventListener('click', async () => {
  const text = letterText();
  try {
    await navigator.clipboard.writeText(text);
    setStatus('Copied to clipboard.');
  } catch {
    // Older browsers, or file:// pages without clipboard permission.
    const range = document.createRange();
    range.selectNodeContents($('letter'));
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    setStatus('Clipboard blocked by the browser. The letter is selected: press Ctrl+C (or Cmd+C) to copy.');
  }
});

$('download').addEventListener('click', () => {
  const blob = new Blob([letterText()], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus(`Downloaded ${downloadName()}.`);
});

$('print').addEventListener('click', () => {
  window.print();
});

// Initial render (no state chosen yet, so the card stays hidden).
renderLawCard();
