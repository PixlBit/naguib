/* ════════════════════════════════════════════════════════════════════════
   version-assets.mjs — put a version on every script and stylesheet URL.

   `_headers` tells browsers to revalidate these files, which is correct
   from now on but does nothing about the copies already sitting in
   people's caches with a day left to live. A changed URL is the only
   thing that reaches those: naguib.art/studio.js?v=7 has never been
   requested before, so it cannot be answered from a cache.

   Run it after any change to a .js or .css file:

       node tools/version-assets.mjs            bump every HTML file
       node tools/version-assets.mjs 12         set an explicit version

   It rewrites index.html, 404.html, studio-admin.html and every generated
   project page, and prints what it touched.
   ════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSET = /(<(?:script[^>]*\ssrc|link[^>]*\shref)="[^"]*?\/?[\w.-]+\.(?:js|css))(\?v=\d+)?(")/g;

/* the current version is whatever the home page already carries */
const home = readFileSync(join(ROOT, 'index.html'), 'utf8');
const seen = [...home.matchAll(/\?v=(\d+)"/g)].map(m => +m[1]);
const current = seen.length ? Math.max(...seen) : 0;
const version = process.argv[2] ? +process.argv[2] : current + 1;
if (!Number.isFinite(version) || version < 1) {
  console.error('version must be a positive number');
  process.exit(1);
}

const pages = ['index.html', '404.html', 'studio-admin.html'];
const work = join(ROOT, 'work');
if (existsSync(work))
  for (const dir of readdirSync(work, { withFileTypes: true }))
    if (dir.isDirectory()) pages.push(join('work', dir.name, 'index.html'));

let touched = 0, total = 0;
for (const rel of pages) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) continue;
  const before = readFileSync(file, 'utf8');
  let n = 0;
  const after = before.replace(ASSET, (_, head, _old, tail) => {
    n++;
    return head + '?v=' + version + tail;
  });
  if (after !== before) { writeFileSync(file, after); touched++; }
  total += n;
}
console.log('version ' + version + ' · ' + total + ' asset urls · ' +
            touched + ' of ' + pages.length + ' pages rewritten');
