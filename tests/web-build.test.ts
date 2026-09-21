import { describe, expect, test } from 'bun:test';
import { createHash } from 'crypto';
import { join } from 'path';
import { buildHtml } from '../build-web';
import { STATE_CODES, STATE_LAWS } from '../letter';

const ROOT = join(import.meta.dir, '..');
const committed = await Bun.file(join(ROOT, 'index.html')).text();

describe('index.html', () => {
  test('is a fresh build of the current sources (run `bun build-web.ts` if this fails)', async () => {
    const fresh = await buildHtml();
    expect(committed).toBe(fresh);
  });

  test('carries every state and its statute', () => {
    for (const code of STATE_CODES) {
      expect(committed).toContain(JSON.stringify(STATE_LAWS[code].statute));
    }
  });

  test('references no external resources and no storage', () => {
    const forbidden = [
      /\ssrc=/i,
      /<link\s/i,
      /@import/i,
      /url\(\s*['"]?https?:/i,
      /\bfetch\s*\(/,
      /XMLHttpRequest/,
      /sendBeacon/,
      /localStorage/,
      /sessionStorage/,
      /document\.cookie/,
      /indexedDB/,
      /https?:\/\/(?!github\.com\/rpriven\/flock-public-records-toolkit)/,
    ];
    for (const re of forbidden) {
      expect(committed.match(re)).toBeNull();
    }
  });

  test('CSP hashes match the inline script and style, with no unsafe-inline', () => {
    const csp = committed.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
    expect(csp).toBeTruthy();
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).toContain("default-src 'none'");

    const script = committed.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    const style = committed.match(/<style>([\s\S]*?)<\/style>/)?.[1];
    expect(script).toBeTruthy();
    expect(style).toBeTruthy();
    const h = (s: string) => `sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}`;
    expect(csp).toContain(`script-src '${h(script!)}'`);
    expect(csp).toContain(`style-src '${h(style!)}'`);
    expect(csp).toContain('font-src data:');
  });

  test('embeds Latin Modern Roman regular and bold as data URIs', () => {
    const faces = committed.match(/@font-face\s*{[^}]*}/g) ?? [];
    expect(faces).toHaveLength(2);
    for (const face of faces) {
      expect(face).toContain('"Latin Modern Roman"');
      expect(face).toMatch(/src: url\(data:font\/woff2;base64,[A-Za-z0-9+/=]{1000,}\) format\("woff2"\)/);
    }
    expect(committed).toContain('font-weight: 400');
    expect(committed).toContain('font-weight: 700');
  });
});
