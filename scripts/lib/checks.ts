// Pure validation helpers shared by the audit scripts and the unit tests.
// They can confirm presence and structure; they cannot prove that claims are true.

import { namesDiffer, type Organization } from '../../src/config/organization.ts';

/** Text the site renders in place of any unconfigured fact. Must never ship. */
export const MISSING_MARKER = 'Content required';

export const PLACEHOLDER_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'TODO', re: /\bTODO\b/i },
  { label: 'TBD', re: /\bTBD\b/i },
  { label: 'Lorem ipsum', re: /lorem\s+ipsum/i },
  { label: '[Company Name]', re: /\[\s*company\s+name\s*\]/i },
  { label: '[Legal Entity]', re: /\[\s*legal\s+entity[^\]]*\]/i },
  { label: 'Coming Soon', re: /\bcoming\s+soon\b/i },
  { label: 'Under Construction', re: /\bunder\s+construction\b/i },
  { label: 'Example Organization', re: /\bexample\s+(organi[sz]ation|company|inc)\b/i },
  { label: 'Your Organization', re: /\byour\s+(organi[sz]ation|company)\s+name\b/i },
  { label: 'Content required marker', re: new RegExp(MISSING_MARKER, 'i') },
];

export function findPlaceholders(text: string): string[] {
  return PLACEHOLDER_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
}

const RESERVED_EMAIL_DOMAIN = /(^|\.)(example\.(com|org|net)|test|invalid|localhost|example)$/i;

export function isValidEmail(email: string): boolean {
  const m = /^[A-Z0-9._%+-]+@([A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,})$/i.exec(email.trim());
  return Boolean(m && !RESERVED_EMAIL_DOMAIN.test(m[1]));
}

export function emailDomain(email: string): string {
  return email.split('@').pop()!.toLowerCase();
}

export interface Issue {
  field: string;
  message: string;
}

const REQUIRED_TEXT_FIELDS = [
  'legalEntityName',
  'legalEntityType',
  'organizationDescription',
  'mission',
  'organizationBackground',
  'city',
  'country',
] as const;

/** Checks a text field is present, not a placeholder, and more than a bare label. */
function checkText(field: string, value: string | null | undefined, issues: Issue[], allowSingleWord = false) {
  const v = value?.trim();
  if (!v) {
    issues.push({ field, message: 'not supplied' });
    return;
  }
  const hits = findPlaceholders(v);
  if (hits.length) issues.push({ field, message: `contains placeholder text (${hits.join(', ')})` });
  // ponytail: "trivial" = a single bare word. Whether text is genuine is a human check.
  if (!allowSingleWord && !/\s/.test(v)) issues.push({ field, message: 'is a single word, not a description' });
}

export function validateOrganization(org: Organization): Issue[] {
  const issues: Issue[] = [];
  const singleWordOk = new Set(['legalEntityName', 'city', 'country']);
  for (const f of REQUIRED_TEXT_FIELDS) checkText(f, org[f], issues, singleWordOk.has(f));

  if (namesDiffer(org) || org.brandRelationship) checkText('brandRelationship', org.brandRelationship, issues);

  // Long-form fields must not just repeat each other or the brand name.
  const longForm = ['organizationDescription', 'mission', 'organizationBackground'] as const;
  const seen = new Map<string, string>();
  for (const f of longForm) {
    const v = org[f]?.trim().toLowerCase();
    if (!v) continue;
    if (v === org.brandName.toLowerCase()) issues.push({ field: f, message: 'only repeats the brand name' });
    const dup = seen.get(v);
    if (dup) issues.push({ field: f, message: `is identical to ${dup}` });
    seen.set(v, f);
  }

  if (!org.activities.length) issues.push({ field: 'activities', message: 'no real activities described' });
  org.activities.forEach((a, i) => {
    checkText(`activities[${i}].title`, a.title, issues, true);
    checkText(`activities[${i}].description`, a.description, issues);
  });

  if (!org.contactEmail?.trim()) issues.push({ field: 'contactEmail', message: 'not supplied' });
  else if (!isValidEmail(org.contactEmail))
    issues.push({ field: 'contactEmail', message: `"${org.contactEmail}" is not a valid, non-reserved email address` });

  if (org.publicPhone !== null && !/^\+?[\d\s().-]{7,}$/.test(org.publicPhone))
    issues.push({ field: 'publicPhone', message: 'set but not a phone number; use null to omit' });
  if (org.logo && (!org.logo.src.startsWith('/') || !org.logo.alt.trim()))
    issues.push({ field: 'logo', message: 'logo needs a /public path and alt text' });

  return issues;
}

/** Non-fatal observations for the content audit. */
export function contentWarnings(org: Organization): string[] {
  const warnings: string[] = [];
  if (org.contactEmail && isValidEmail(org.contactEmail)) {
    const d = emailDomain(org.contactEmail);
    const allowed = [org.domain, ...org.controlledEmailDomains].map((x) => x.toLowerCase());
    if (!allowed.some((a) => d === a || d.endsWith(`.${a}`)))
      warnings.push(
        `contactEmail domain "${d}" is not ${org.domain} and not listed in controlledEmailDomains. ` +
          'Apple expects a work email associated with the organization domain.',
      );
  }
  return warnings;
}

/** Visible text of an HTML document (scripts, styles, and tags removed). */
export function htmlToText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export const PARKING_PHRASES: RegExp[] = [
  /parked\s+free/i,
  /courtesy\s+of\s+godaddy/i,
  /get\s+this\s+domain/i,
  /this\s+domain\s+(is|may\s+be)\s+for\s+sale/i,
  /buy\s+this\s+domain/i,
  /domain\s+is\s+parked/i,
];

/** Markers of registrar/parking infrastructure in raw HTML, independent of wording. */
export const PARKING_INFRA: RegExp[] = [
  /window\.location\.href\s*=\s*["']\/lander["']/i,
  /wsimg\.com\/parking-lander/i,
  /lander_type=parkweb/i,
  /godaddy\.com\/(forsale|domainsearch)/i,
  /sedoparking|parkingcrew|bodis\.com|afternic\.com|dan\.com\/buy-domain/i,
];

export interface ParkingResult {
  parked: boolean;
  reasons: string[];
}

/**
 * A page is treated as parked if it contains parking infrastructure, or if it shows
 * parking wording without the organization's identity. Parking wording that appears
 * incidentally on a page that clearly carries the organization identity is not enough.
 */
export function detectParking(html: string, identity: string[], headers: Record<string, string> = {}): ParkingResult {
  const reasons: string[] = [];
  const raw = html + '\n' + Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n');
  for (const re of PARKING_INFRA) if (re.test(raw)) reasons.push(`parking infrastructure: ${re.source}`);
  const text = htmlToText(html);
  const phrases = PARKING_PHRASES.filter((re) => re.test(text)).map((re) => re.source);
  const hasIdentity = identity.length > 0 && identity.every((id) => text.toLowerCase().includes(id.toLowerCase()));
  if (phrases.length && !hasIdentity) reasons.push(`parking wording without organization identity: ${phrases.join(', ')}`);
  return { parked: reasons.length > 0, reasons };
}

export function hasNoindex(html: string, headers: Record<string, string> = {}): boolean {
  const robotsHeader = Object.entries(headers).find(([k]) => k.toLowerCase() === 'x-robots-tag')?.[1] ?? '';
  if (/noindex/i.test(robotsHeader)) return true;
  return /<meta[^>]+name=["']?(robots|googlebot)["']?[^>]*content=["'][^"']*noindex/i.test(html);
}
