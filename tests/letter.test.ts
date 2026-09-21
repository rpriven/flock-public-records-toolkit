import { describe, expect, test } from 'bun:test';
import {
  STATE_LAWS,
  STATE_CODES,
  DEFAULT_DATE_RANGE,
  addBusinessDays,
  buildVehicleInfo,
  generateLetter,
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
    expect(isValidZip('80002')).toBe(true);
    expect(isValidZip(' 80002-1234 ')).toBe(true);
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
    expect(sanitizeFilename('Denver Police Dept. / Records')).toBe('Denver_Police_Dept_Records');
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
    state: 'Colorado',
    stateCode: 'CO',
    zip: '80001',
    lawName: STATE_LAWS.CO.lawName,
    statute: STATE_LAWS.CO.statute,
    responseTime: STATE_LAWS.CO.responseTime,
    yourName: 'Jane Doe',
    yourAddress: '5 Elm St',
    yourCity: 'Testtown',
    yourState: 'Colorado',
    yourZip: '80002',
    yourEmail: 'jane@example.com',
    yourPhone: '',
    vehicleInfo: '',
    expedited: false,
  };

  test('cites the chosen state law and lists twelve items', () => {
    const text = generateLetter(base);
    expect(text).toContain('Colorado Open Records Act (CORA) (C.R.S. §24-72-201 et seq.)');
    expect(text).toContain('within 10 business days as required by C.R.S. §24-72-203(3)(b)');
    for (let i = 1; i <= 12; i++) expect(text).toMatch(new RegExp(`^${i}\\. `, 'm'));
    expect(text).not.toContain('13. Vehicle');
    expect(text).not.toContain('TIME-SENSITIVE');
    expect(text).not.toContain('Phone:');
    expect(text.trimEnd().endsWith('Jane Doe')).toBe(true);
  });

  test('expedited, phone and vehicle sections appear when set', () => {
    const text = generateLetter({
      ...base,
      expedited: true,
      yourPhone: '303-555-0100',
      vehicleInfo: buildVehicleInfo('ABC1234', '2020 Honda Civic, blue', ''),
    });
    expect(text).toContain('TIME-SENSITIVE REQUEST');
    expect(text).toContain('Phone: 303-555-0100');
    expect(text).toContain(`13. Vehicle-Specific Request: All images, footage, and associated data for license plate ABC1234 (2020 Honda Civic, blue) for the period of ${DEFAULT_DATE_RANGE}.`);
  });
});
