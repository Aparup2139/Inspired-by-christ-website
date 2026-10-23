// Live production audit: `npm run audit:live [-- --url=https://example.onrender.com]`
// (or LIVE_URL=...). Defaults to the production domain. Exits non-zero on any FAIL or
// BLOCKED result. Network, DNS, and TLS failures are never reported as passes.

import { promises as dns } from 'node:dns';
import tls from 'node:tls';
import { organization, publicPaths } from '../src/config/organization.ts';
import { detectParking, emailDomain, findPlaceholders, hasNoindex, htmlToText, isValidEmail } from './lib/checks.ts';

type Status = 'PASS' | 'FAIL' | 'BLOCKED' | 'MANUAL';
const results: { status: Status; name: string; detail: string }[] = [];
const record = (status: Status, name: string, detail = '') => results.push({ status, name, detail });

const arg = process.argv.find((a) => a.startsWith('--url='))?.slice(6);
const target = new URL(arg ?? process.env.LIVE_URL ?? `https://${organization.domain}`);
const isProduction = target.hostname === organization.domain;
const canonicalHost = target.hostname;
const canonicalOrigin = `https://${canonicalHost}`;

interface Hop {
  url: string;
  status: number;
}
interface Fetched {
  chain: Hop[];
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  body: string;
}

function describeError(e: unknown): { kind: 'dns' | 'tls' | 'network'; message: string } {
  const cause = (e as { cause?: { code?: string; message?: string } }).cause;
  const code = cause?.code ?? (e as { code?: string }).code ?? '';
  const message = `${code} ${cause?.message ?? (e as Error).message}`.trim();
  if (/ENOTFOUND|EAI_AGAIN|ENODATA/.test(code)) return { kind: 'dns', message };
  if (/CERT|SSL|TLS|SELF_SIGNED|UNABLE_TO_VERIFY|ERR_TLS/i.test(message)) return { kind: 'tls', message };
  return { kind: 'network', message };
}

/** Follows redirects manually so every hop can be checked. */
async function get(url: string): Promise<Fetched> {
  const chain: Hop[] = [];
  let current = url;
  for (let i = 0; i < 10; i++) {
    const res = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    chain.push({ url: current, status: res.status });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).href;
      continue;
    }
    return { chain, finalUrl: current, status: res.status, headers: Object.fromEntries(res.headers), body: await res.text() };
  }
  throw new Error(`more than 10 redirects starting at ${url}`);
}

async function tryGet(name: string, url: string): Promise<Fetched | null> {
  try {
    return await get(url);
  } catch (e) {
    const err = describeError(e);
    // An unreachable production domain is a real failure; a local network outage is not evidence either way.
    record(err.kind === 'network' ? 'BLOCKED' : 'FAIL', name, `${err.kind} error fetching ${url}: ${err.message}`);
    return null;
  }
}

const chainText = (f: Fetched) => f.chain.map((h) => `${h.status} ${h.url}`).join(' -> ') + ` (final ${f.status})`;

const identity = [organization.brandName, ...(organization.legalEntityName ? [organization.legalEntityName] : [])];

function checkSitePage(name: string, f: Fetched) {
  const final = new URL(f.finalUrl);
  const parking = detectParking(f.body, identity, f.headers);
  if (parking.parked) {
    record('FAIL', name, `registrar parking page detected (${parking.reasons.join('; ')}). ${chainText(f)}`);
    return false;
  }
  const problems: string[] = [];
  if (f.status !== 200) problems.push(`status ${f.status}`);
  if (final.protocol !== 'https:') problems.push('final URL is not HTTPS');
  if (final.hostname !== canonicalHost) problems.push(`final host ${final.hostname} is not ${canonicalHost}`);
  const text = htmlToText(f.body);
  const missingId = identity.filter((id) => !text.toLowerCase().includes(id.toLowerCase()));
  if (missingId.length) problems.push(`identity not shown: ${missingId.join(', ')}`);
  const placeholders = findPlaceholders(text);
  if (placeholders.length) problems.push(`placeholder content: ${placeholders.join(', ')}`);
  if (f.status === 401 || f.status === 403 || /<input[^>]+type=["']?password/i.test(f.body)) problems.push('requires login');
  if (hasNoindex(f.body, f.headers)) problems.push('noindex directive present');
  record(problems.length ? 'FAIL' : 'PASS', name, problems.length ? `${problems.join('; ')}. ${chainText(f)}` : chainText(f));
  return !problems.length;
}

async function checkCert(host: string) {
  const name = `TLS certificate valid for ${host}`;
  await new Promise<void>((resolve) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: 15000 }, () => {
      const cert = socket.getPeerCertificate();
      const days = Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86400000);
      if (socket.authorized) record('PASS', name, `issuer ${cert.issuer?.O ?? cert.issuer?.CN}, expires in ${days} days`);
      else record('FAIL', name, `certificate not trusted: ${socket.authorizationError}`);
      socket.end();
      resolve();
    });
    socket.on('error', (e) => {
      record('FAIL', name, describeError(e).message);
      resolve();
    });
    socket.on('timeout', () => {
      record('BLOCKED', name, 'connection timed out');
      socket.destroy();
      resolve();
    });
  });
}

async function resolveHost(host: string) {
  const [a, aaaa, cname] = await Promise.all([
    dns.resolve4(host).catch(() => [] as string[]),
    dns.resolve6(host).catch(() => [] as string[]),
    dns.resolveCname(host).catch(() => [] as string[]),
  ]);
  return { a, aaaa, cname };
}

// ---- Group F: DNS and certificates ----
if (isProduction) {
  for (const host of [organization.domain, `www.${organization.domain}`]) {
    const r = await resolveHost(host);
    const found = [...r.cname.map((c) => `CNAME ${c}`), ...r.a.map((ip) => `A ${ip}`)];
    record(found.length ? 'PASS' : 'FAIL', `DNS resolves ${host}`, found.join(', ') || 'no A or CNAME records');
    if (r.aaaa.length) record('FAIL', `No AAAA records on ${host} (Render requirement)`, `found ${r.aaaa.join(', ')}; remove them`);
  }
  // 216.24.57.1 is Render's documented load balancer IP for root A records.
  // 15.197.148.33 / 3.33.130.190 are the GoDaddy parking/forwarding IPs this domain used before.
  const rootA = (await resolveHost(organization.domain)).a;
  const parkingIps = rootA.filter((ip) => ['15.197.148.33', '3.33.130.190'].includes(ip));
  if (parkingIps.length) record('FAIL', 'Root domain points to Render', `A ${parkingIps.join(', ')} are GoDaddy parking/forwarding IPs; replace with Render's record`);
  else if (rootA.includes('216.24.57.1')) record('PASS', 'Root domain points to Render', 'A 216.24.57.1');
  else record('MANUAL', 'Root domain points to Render', `A ${rootA.join(', ') || 'none'}; compare with the record shown in the Render dashboard`);
  await checkCert(organization.domain);
  await checkCert(`www.${organization.domain}`);
} else {
  record('BLOCKED', 'Custom domain DNS and TLS', `target ${canonicalHost} is not ${organization.domain}; run without --url once the domain is connected`);
  await checkCert(canonicalHost);
}

// ---- Group E: homepage, hostname variants, redirects ----
const home = await tryGet('Homepage', `${canonicalOrigin}/`);
let homeOk = false;
if (home) homeOk = checkSitePage(`Homepage ${canonicalOrigin}/ shows the organization site`, home);

if (home && homeOk) {
  const canonical = /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)/i.exec(home.body)?.[1];
  const expected = `https://${organization.domain}/`;
  record(canonical === expected ? 'PASS' : 'FAIL', 'Canonical URL is the root domain', `found ${canonical ?? 'none'}, expected ${expected}`);

  const csp = home.headers['content-security-policy'];
  const nosniff = home.headers['x-content-type-options'];
  record(csp && nosniff ? 'PASS' : 'FAIL', 'Security headers from render.yaml applied', `CSP: ${csp ? 'present' : 'missing'}, nosniff: ${nosniff ?? 'missing'}`);

  // CSS and scripts referenced by the homepage must load.
  const assets = [...home.body.matchAll(/<(?:link[^>]+rel=["']stylesheet["'][^>]*href|script[^>]+src)=["']([^"']+)/gi)].map((m) => new URL(m[1], home.finalUrl).href);
  if (!assets.some((a) => a.endsWith('.css'))) record('FAIL', 'Stylesheet referenced', 'no stylesheet link found on the homepage');
  for (const asset of assets) {
    const f = await tryGet(`Asset ${asset}`, asset);
    if (!f) continue;
    const type = f.headers['content-type'] ?? '';
    const typeOk = asset.endsWith('.css') ? type.includes('text/css') : /javascript/.test(type);
    record(f.status === 200 && typeOk ? 'PASS' : 'FAIL', `Asset loads: ${new URL(asset).pathname}`, `status ${f.status}, ${type}`);
  }
}

const variants: { name: string; url: string; expectFirst?: (hop: Hop, next?: Hop) => string | null }[] = [
  {
    name: 'HTTP upgrades to HTTPS',
    url: `http://${canonicalHost}/`,
    expectFirst: (hop, next) =>
      hop.status >= 300 && hop.status < 400 && next?.url.startsWith('https://') ? null : 'first response is not a redirect to HTTPS',
  },
  {
    name: '/lander redirects permanently to /',
    url: `${canonicalOrigin}/lander`,
    expectFirst: (hop) => ([301, 308].includes(hop.status) ? null : `first response ${hop.status}, expected 301`),
  },
];
if (isProduction) variants.unshift({ name: `www.${organization.domain} redirects to root`, url: `https://www.${organization.domain}/` });

for (const v of variants) {
  const f = await tryGet(v.name, v.url);
  if (!f) continue;
  const wrong = v.expectFirst?.(f.chain[0], f.chain[1]);
  const final = new URL(f.finalUrl);
  if (wrong) record('FAIL', v.name, `${wrong}. ${chainText(f)}`);
  else if (final.hostname !== canonicalHost || final.pathname !== '/') record('FAIL', v.name, `ended at ${f.finalUrl}. ${chainText(f)}`);
  else checkSitePage(v.name, f);
}

// Important pages through direct URLs, with and without a trailing slash.
for (const p of publicPaths.filter((x) => x !== '/')) {
  for (const path of [p, p.replace(/\/$/, '')]) {
    const f = await tryGet(`Direct URL ${path}`, `${canonicalOrigin}${path}`);
    if (f) checkSitePage(`Direct URL ${path}`, f);
  }
}

// ---- Group F: work email ----
const email = organization.contactEmail;
if (!email || !isValidEmail(email)) {
  record('BLOCKED', 'Work email configured', 'contactEmail is not set in src/config/organization.ts');
} else {
  const domain = emailDomain(email);
  const allowed = [organization.domain, ...organization.controlledEmailDomains];
  record(
    allowed.some((a) => domain === a || domain.endsWith(`.${a}`)) ? 'PASS' : 'FAIL',
    'Work email uses an organization domain',
    `${email}; allowed: ${allowed.join(', ')}`,
  );
  const mx = await dns.resolveMx(domain).catch(() => []);
  record(mx.length ? 'PASS' : 'FAIL', `MX records for ${domain}`, mx.map((m) => m.exchange).join(', ') || 'none: mail to this domain cannot be delivered');
  const txt = (await dns.resolveTxt(domain).catch(() => [])).map((r) => r.join(''));
  const dmarc = (await dns.resolveTxt(`_dmarc.${domain}`).catch(() => [])).map((r) => r.join(''));
  const spf = txt.find((t) => t.startsWith('v=spf1'));
  record(spf ? 'PASS' : 'MANUAL', `SPF record for ${domain}`, spf ?? 'not found; confirm with your email provider');
  const dm = dmarc.find((t) => t.startsWith('v=DMARC1'));
  record(dm ? 'PASS' : 'MANUAL', `DMARC record for ${domain}`, dm ?? 'not found; confirm with your email provider');
}
record('MANUAL', 'Work inbox exists and receives mail', 'DNS records do not prove an inbox works. Send a test message from another account and confirm it arrives.');
record('MANUAL', 'Organization owns the domain', 'Confirm the GoDaddy registration is held by, or on behalf of, the legal entity.');

// ---- Report ----
const width = Math.max(...results.map((r) => r.name.length));
console.log(`Live audit of ${target.href}  (${new Date().toISOString()})\n`);
for (const r of results) console.log(`${r.status.padEnd(7)} ${r.name.padEnd(width)}  ${r.detail}`);
const count = (s: Status) => results.filter((r) => r.status === s).length;
console.log(`\nPASS ${count('PASS')}  FAIL ${count('FAIL')}  BLOCKED ${count('BLOCKED')}  MANUAL ${count('MANUAL')}`);
if (home && detectParking(home.body, identity, home.headers).parked)
  console.log(`\n${canonicalHost} still serves a registrar parking page: the custom domain is not connected to Render yet. See DEPLOYMENT.md.`);
process.exit(count('FAIL') || count('BLOCKED') ? 1 : 0);
