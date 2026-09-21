#!/usr/bin/env bun

/**
 * Build the single-file web app.
 *
 *   bun build-web.ts            # writes ./index.html
 *   bun build-web.ts --check    # exit 1 if ./index.html is out of date
 *
 * Bundles web/app.ts (which imports letter.ts and state-laws.json) into an
 * unminified script, inlines it into web/index.template.html, and fills in
 * the Content-Security-Policy hashes so the page runs with no
 * 'unsafe-inline' allowance. The output is deterministic: the same inputs
 * always produce the same index.html, which is what the tests check.
 */

import { createHash } from 'crypto';
import { join } from 'path';

const ROOT = import.meta.dir;
const TEMPLATE = join(ROOT, 'web', 'index.template.html');
const ENTRY = join(ROOT, 'web', 'app.ts');
const OUTPUT = join(ROOT, 'index.html');

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('base64');
}

export async function buildHtml(): Promise<string> {
  const result = await Bun.build({
    entrypoints: [ENTRY],
    target: 'browser',
    format: 'iife',
    minify: false,
    sourcemap: 'none',
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error('Bundle failed');
  }
  const js = (await result.outputs[0].text()).trimEnd();
  if (js.includes('</script')) {
    throw new Error('Bundle contains "</script", which would break inline embedding');
  }

  let html = await Bun.file(TEMPLATE).text();

  // Embed the subset Latin Modern Roman fonts as data: URIs (GUST Font License).
  for (const [placeholder, file] of [
    ['__FONT_REGULAR_B64__', 'lmroman10-regular.woff2'],
    ['__FONT_BOLD_B64__', 'lmroman10-bold.woff2'],
  ] as const) {
    const bytes = await Bun.file(join(ROOT, 'web', 'fonts', file)).arrayBuffer();
    if (!html.includes(placeholder)) throw new Error(`Template is missing ${placeholder}`);
    html = html.replace(placeholder, Buffer.from(bytes).toString('base64'));
  }

  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  if (!styleMatch) throw new Error('Template has no <style> block');
  const styleHash = `sha256-${sha256(styleMatch[1])}`;

  if (!html.includes('<!--APP_SCRIPT-->')) throw new Error('Template is missing <!--APP_SCRIPT-->');
  const scriptBody = `\n${js}\n`;
  const scriptHash = `sha256-${sha256(scriptBody)}`;

  html = html
    .replace('<!--APP_SCRIPT-->', `<script>${scriptBody}</script>`)
    .replace('__SCRIPT_HASH__', scriptHash)
    .replace('__STYLE_HASH__', styleHash);

  const leftover = ['__SCRIPT_HASH__', '__STYLE_HASH__', '__FONT_REGULAR_B64__', '__FONT_BOLD_B64__'].filter((p) => html.includes(p));
  if (leftover.length) {
    throw new Error('CSP placeholders were not all replaced');
  }
  return html;
}

if (import.meta.main) {
  const html = await buildHtml();
  const check = process.argv.includes('--check');
  if (check) {
    const current = (await Bun.file(OUTPUT).exists()) ? await Bun.file(OUTPUT).text() : '';
    if (current === html) {
      console.log('index.html is up to date');
    } else {
      console.error('index.html is OUT OF DATE: run `bun build-web.ts`');
      process.exit(1);
    }
  } else {
    await Bun.write(OUTPUT, html);
    const bytes = Buffer.byteLength(html, 'utf8');
    console.log(`wrote index.html (${bytes} bytes, ${Object.keys((await import('./state-laws.json')).default).length} states)`);
  }
}
