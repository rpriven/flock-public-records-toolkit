import { describe, expect, test } from 'bun:test';
import {
  STATE_LAWS,
  STATE_CODES,
  DEFAULT_DATE_RANGE,
  addBusinessDays,
  buildVehicleInfo,
  generateLetter,
  letterParts,
  isValidEmail,
  isValidZip,
  normalizeStateCode,
  sanitizeFilename,
  sanitizeLicensePlate,
  sanitizeText,
} from '../letter';

describe('state law data', () => {
  test('every state has the six fields and a statute', () => {
    expect(STATE_CODES.length).toBeGreaterThanOrEqual(20);
    for (const code of STATE_CODES) {
      const law = STATE_LAWS[code];
      expect(code).toMatch(/^[A-Z]{2}$/);
      expect(law.name).toBeTruthy();
      expect(law.lawName).toBeTruthy();
      expect(law.statute).toMatch(/§|RCW|ILCS|MCL|ORS/);
      expect(law.responseTime).toBeTruthy();
      expect(law.specificTimeframe === null || typeof law.specificTimeframe === 'number').toBe(true);
      expect(law.notes).toBeTruthy();
    }
  });

  test('codes are sorted', () => {
    expect(STATE_CODES).toEqual([...STATE_CODES].sort());
  });
});

describe('validators', () => {
  test('zip', () => {
    expect(isValidZip('12345')).toBe(true);
    expect(isValidZip(' 12345-6789 ')).toBe(true);
    expect(isValidZip('8000')).toBe(false);
    expect(isValidZip('abcde')).toBe(false);
  });
  test('email', () => {
    expect(isValidEmail('jane@example.com')).toBe(true);
    expect(isValidEmail('jane@')).toBe(false);
    expect(isValidEmail('jane example.com')).toBe(false);
  });
  test('state code normalizes', () => {
    expect(normalizeStateCode(' co ')).toBe('CO');
    expect(normalizeStateCode('c0lorado')).toBe('CL');
  });
  test('text strips control characters and caps length', () => {
    expect(sanitizeText('a\x00b\x1fc', 10)).toBe('abc');
    expect(sanitizeText('x'.repeat(50), 10)).toHaveLength(10);
  });
  test('filename is filesystem safe', () => {
    expect(sanitizeFilename('Springfield Police Dept. / Records')).toBe('Springfield_Police_Dept_Records');
    expect(sanitizeFilename('../../etc/passwd')).toBe('etcpasswd');
  });
  test('license plate', () => {
    expect(sanitizeLicensePlate(' abc-1234! ')).toBe('ABC-1234');
  });
});

describe('business days', () => {
  test('friday plus one business day is monday', () => {
    const fri = new Date(2026, 8, 18); // Fri Sep 18 2026
    expect(addBusinessDays(fri, 1).getDay()).toBe(1);
    expect(addBusinessDays(fri, 1).getDate()).toBe(21);
  });
  test('ten business days from a monday is the monday two weeks later', () => {
    const mon = new Date(2026, 8, 21);
    const due = addBusinessDays(mon, 10);
    expect(due.getDay()).toBe(1);
    expect(due.getDate()).toBe(5); // Mon Oct 5 2026
    expect(due.getMonth()).toBe(9);
  });
  test('zero days returns the same date', () => {
    const d = new Date(2026, 8, 21);
    expect(addBusinessDays(d, 0).getTime()).toBe(d.getTime());
  });
});

describe('letter', () => {
  const base = {
    date: 'September 20, 2026',
    agencyName: 'Test Police Department',
    agencyAddress: '100 Main St',
    city: 'Testville',
    state: 'Illinois',
    stateCode: 'IL',
    zip: '62701',
    lawName: STATE_LAWS.IL.lawName,
    statute: STATE_LAWS.IL.statute,
    responseTime: STATE_LAWS.IL.responseTime,
    yourName: 'Jane Doe',
    yourAddress: '5 Elm St',
    yourCity: 'Testtown',
    yourState: 'Illinois',
    yourZip: '62702',
    yourEmail: 'jane@example.com',
    yourPhone: '',
    vehicleInfo: '',
    expedited: false,
  };

  test('cites the chosen state law and lists twelve items', () => {
    const text = generateLetter(base);
    expect(text).toContain('Illinois Freedom of Information Act (FOIA) (5 ILCS 140/1 et seq.)');
    expect(text).toContain('within 5 business days as required by 5 ILCS 140/3(d)');
    for (let i = 1; i <= 12; i++) expect(text).toMatch(new RegExp(`^${i}\\. `, 'm'));
    expect(text).not.toContain('13. Vehicle');
    expect(text).not.toContain('TIME-SENSITIVE');
    expect(text).not.toContain('Phone:');
    expect(text.trimEnd().endsWith('Jane Doe')).toBe(true);
  });

  test('structured parts and the plain text agree', () => {
    const params = { ...base, expedited: true, yourPhone: '555-0100', vehicleInfo: buildVehicleInfo('ABC1234', '2020 Honda Civic, blue', '') };
    const p = letterParts(params);
    expect(p.items).toHaveLength(13);
    expect(p.items[12].label).toBe('Vehicle-Specific Request');
    expect(p.requesterBlock).toEqual(['Jane Doe', '5 Elm St', 'Testtown, Illinois 62702', 'Email: jane@example.com', 'Phone: 555-0100']);
    expect(p.expedited).toBeTruthy();
    const text = generateLetter(params);
    for (const item of p.items) expect(text).toContain(`${item.n}. ${item.label}: ${item.text}`);
    expect(text).toContain(`⚠️ TIME-SENSITIVE REQUEST: ${p.expedited}`);
  });

  test('a custom vehicleInfo that is not an item is appended verbatim', () => {
    const custom = '\n\nAdditionally: please include the camera map.';
    const text = generateLetter({ ...base, vehicleInfo: custom });
    expect(text).toContain('federal sharing settings' + custom + '\n\nPlease provide records');
  });

  test('expedited, phone and vehicle sections appear when set', () => {
    const text = generateLetter({
      ...base,
      expedited: true,
      yourPhone: '555-0100',
      vehicleInfo: buildVehicleInfo('ABC1234', '2020 Honda Civic, blue', ''),
    });
    expect(text).toContain('TIME-SENSITIVE REQUEST');
    expect(text).toContain('Phone: 555-0100');
    expect(text).toContain(`13. Vehicle-Specific Request: All images, footage, and associated data for license plate ABC1234 (2020 Honda Civic, blue) for the period of ${DEFAULT_DATE_RANGE}.`);
  });
});
