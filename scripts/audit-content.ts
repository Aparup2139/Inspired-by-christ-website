// Content-readiness audit: `npm run audit:content` (run after `npm run build`).
// Exits non-zero when organization facts are missing, placeholder text remains in
// the built site, or required pages are absent. It checks presence and structure only;
// a person must still confirm every published fact is true.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { organization, publicPaths, siteUrl } from '../src/config/organization.ts';
import { contentWarnings, findPlaceholders, hasNoindex, htmlToText, validateOrganization } from './lib/checks.ts';

const root = join(import.meta.dirname, '..');
const dist = join(root, 'dist');
const failures: string[] = [];
const passes: string[] = [];
const check = (ok: boolean, label: string) => (ok ? passes : failures).push(label);

// 1. Organization facts
const issues = validateOrganization(organization);
for (const i of issues) failures.push(`organization.${i.field}: ${i.message}`);
if (!issues.length) passes.push('organization config: all essential facts supplied');
const warnings = contentWarnings(organization);

// 2. Built pages
if (!existsSync(dist)) {
  failures.push('dist/ not found: run `npm run build` first');
} else {
  for (const p of publicPaths) {
    const file = join(dist, p, 'index.html');
    if (!existsSync(file)) {
      failures.push(`page ${p}: missing from build (${file})`);
      continue;
    }
    const html = readFileSync(file, 'utf8');
    const text = htmlToText(html);
    const hits = findPlaceholders(text);
    check(!hits.length, `page ${p}: ${hits.length ? `placeholder content found (${hits.join(', ')})` : 'no placeholder content'}`);
    check(text.includes(organization.brandName), `page ${p}: shows brand name`);
    check(!hasNoindex(html), `page ${p}: not marked noindex`);
    check(html.includes(`<link rel="canonical" href="${new URL(p, siteUrl).href}"`), `page ${p}: canonical URL on ${siteUrl}`);
  }

  const sitemapFile = join(dist, 'sitemap.xml');
  const sitemap = existsSync(sitemapFile) ? readFileSync(sitemapFile, 'utf8') : '';
  check(publicPaths.every((p) => sitemap.includes(`<loc>${new URL(p, siteUrl).href}</loc>`)), 'sitemap.xml lists every public page');

  const robotsFile = join(dist, 'robots.txt');
  const robots = existsSync(robotsFile) ? readFileSync(robotsFile, 'utf8') : '';
  check(Boolean(robots) && !/^Disallow:\s*\/\s*$/im.test(robots), 'robots.txt exists and does not block the site');

  // Render skips redirect rules when a file exists at the path.
  check(!existsSync(join(dist, 'lander')) && !existsSync(join(dist, 'lander.html')), 'no /lander file shadows the redirect');
}

// 3. Deployment config
const renderYaml = existsSync(join(root, 'render.yaml')) ? readFileSync(join(root, 'render.yaml'), 'utf8') : '';
check(/source:\s*\/lander\s*\n\s*destination:\s*\/\s*$/m.test(renderYaml), 'render.yaml redirects /lander to /');

// Report
for (const p of passes) console.log(`PASS  ${p}`);
for (const w of warnings) console.log(`WARN  ${w}`);
for (const f of failures) console.log(`FAIL  ${f}`);
console.log(`\n${passes.length} passed, ${failures.length} failed, ${warnings.length} warnings.`);
if (failures.length) {
  console.log('Content audit FAILED: the site is not release-ready. Supply the facts listed in CONTENT_REQUIRED.md.');
  process.exit(1);
}
console.log('Content audit passed. A person must still confirm every published fact is accurate (MANUAL).');
