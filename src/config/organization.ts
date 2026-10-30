/**
 * Single source of truth for every organization fact shown on the website.
 *
 * Rules:
 * - Only enter facts that are true and that the organization approves for publication.
 * - Leave unknown values as `null` (or an empty list). The site renders a visible
 *   "Content required" notice for them and `npm run audit:content` fails, which
 *   blocks the Render build. Never replace a `null` with invented text.
 * - Do not publish the D-U-N-S number anywhere on the website.
 *
 * See CONTENT_REQUIRED.md for what each field must contain.
 */

export type ActivityStatus = 'active' | 'available' | 'in-development' | 'planned';

export interface Activity {
  /** Short name of the real product, service, project, or activity. */
  title: string;
  /** What it actually is and does, in plain language. */
  description: string;
  /** Accurate status. Use 'in-development' for anything not yet released. */
  status: ActivityStatus;
}

export interface Logo {
  /** Path under /public, e.g. "/assets/logo.svg". Must be a genuine brand asset. */
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface Organization {
  brandName: string;
  /** Production domain (no protocol). Canonical host is the root domain. */
  domain: string;
  /** Exact registered legal name, as it appears in official registration records. */
  legalEntityName: string | null;
  /** Actual legal form, e.g. "limited liability company registered in ...". */
  legalEntityType: string | null;
  /** How the legal entity operates the brand. Required when the names differ. */
  brandRelationship: string | null;
  organizationDescription: string | null;
  mission: string | null;
  organizationBackground: string | null;
  activities: Activity[];
  /** Real operational work email, ideally on the organization's domain. */
  contactEmail: string | null;
  /**
   * Other email domains the organization controls, if the contact email is not on
   * `domain`. Document the reason in CONTENT_REQUIRED.md.
   */
  controlledEmailDomains: string[];
  city: string | null;
  country: string | null;
  /** Optional. Only publish if the number is real and approved for publication. */
  publicPhone: string | null;
  /** Optional genuine brand asset. */
  logo: Logo | null;
}

export const organization: Organization = {
  brandName: 'Inspired by Christ',
  domain: 'inspired-by-christ.com',
  // Sources: D-U-N-S business record, business card, and the "Are you bold in your faith?" statement.
  legalEntityName: 'Inspired By Christ Inc',
  legalEntityType: 'Corporation with its registered address in Sheridan, Wyoming, United States',
  brandRelationship: 'Inspired by Christ is the brand of Inspired By Christ Inc.',
  organizationDescription:
    'Inspired by Christ is a Christian faith brand for people who are bold in their faith and strong believers in the body of Christ. Its message is simple: be bold in your faith.',
  mission:
    'Our mission is to touch lives, inspire people to walk in their faith, and encourage believers to be bold in building up their faith.',
  organizationBackground:
    'Inspired by Christ was created for people who are bold in their faith and are not ashamed to express their love for Christ. The brand stands for boldness, faith, unity, and believers in Christ. God does not separate us or treat us differently based on race, gender, denomination, or country, and Inspired by Christ welcomes all believers as brothers and sisters, one in Christ.',
  activities: [
    {
      title: 'Faith-inspired apparel',
      description:
        'Clothing that carries the Inspired by Christ design, whose bold lettering is modeled on the cover of the Holy Bible, so that what believers wear reflects what they believe.',
      status: 'active',
    },
  ],
  contactEmail: 'info@inspired-by-christ.com',
  controlledEmailDomains: [],
  city: 'Sheridan, Wyoming',
  country: 'United States',
  publicPhone: null,
  // Header mark (no URL line). The full logo with URL is /assets/logo.png (738x524).
  logo: { src: '/assets/logo-mark.png', alt: 'Inspired by Christ', width: 193, height: 112 },
};

export const siteUrl = `https://${organization.domain}`;

/** Every public page. Used by the sitemap, the tests, and the audits. */
export const publicPaths = ['/', '/about/', '/our-work/', '/contact/', '/privacy/'];

export const activityStatusLabel: Record<ActivityStatus, string> = {
  active: 'Ongoing',
  available: 'Available now',
  'in-development': 'In development, not yet released',
  planned: 'Planned, not yet started',
};

/** "City, Country" from whatever is configured, or null when neither is set. */
export function publicLocation(org: Organization = organization): string | null {
  const parts = [org.city, org.country].filter((p): p is string => Boolean(p?.trim()));
  return parts.length ? parts.join(', ') : null;
}

/** True when the legal entity name differs from the brand name. */
export function namesDiffer(org: Organization = organization): boolean {
  if (!org.legalEntityName) return true;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return norm(org.legalEntityName) !== norm(org.brandName);
}
