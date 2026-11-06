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
  /** Official social profiles (full https URLs). */
  socialLinks: { label: string; href: string }[];
  /** Public store listings. The "Download our app" section shows only the ones that are set. */
  appStoreUrl: string | null;
  googlePlayUrl: string | null;
}

export const organization: Organization = {
  brandName: 'Inspired by Christ',
  domain: 'inspired-by-christ.com',
  // Sources: D-U-N-S business record, business card, and text supplied by the organization.
  legalEntityName: 'INSPIRED BY CHRIST INC',
  legalEntityType: 'Corporation with its registered address in Sheridan, Wyoming, United States',
  // Not needed: the legal name is the brand name plus "Inc" (see namesDiffer).
  brandRelationship: null,
  organizationDescription:
    'Founded in 2012, Inspired by Christ is a worldwide, Christ-centered brand and live-streaming platform that brings believers of all denominations together through faith, boldness, and unity. Unashamed to express their love for Jesus Christ, members can connect through live streaming, podcasts, interactive Bible study chats, and other engaging features designed to inspire, strengthen faith, and build a global community united as one family in Christ, regardless of race, gender, nationality, or denomination.',
  mission:
    'Our mission is to create a worldwide, Christ-centered platform for believers of all denominations to unite, inspire one another, grow in faith, and boldly express their love for Jesus Christ.',
  // Blank lines separate paragraphs on the About page.
  organizationBackground:
    'Inspired by Christ was created in 2012 for people who are bold in their faith and unashamed to express their love for Christ.\n\n' +
    'The brand represents boldness, faith, unity, and a shared love for Jesus Christ. We believe that God does not separate us or treat us differently based on race, gender, denomination, or nationality. In His eyes, we are all equal.\n\n' +
    'Inspired by Christ welcomes all believers as brothers and sisters in Christ, united by one faith and one love for Him.',
  activities: [
    {
      title: 'Faith-inspired apparel',
      description:
        'Inspired by Christ is a Christian faith-based apparel brand for believers who are bold in their faith and unashamed to express their love for Jesus Christ. Our message is simple: Be Bold in Your Faith. Featuring bold lettering inspired by the cover of the Holy Bible, our apparel allows believers to wear their faith proudly. Every purchase helps support and sustain sober living homes, group homes, and housing initiatives for veterans, making a difference in the lives of others through faith, unity, and giving.',
      status: 'active',
    },
  ],
  contactEmail: 'help@inspired-by-christ.com',
  controlledEmailDomains: [],
  city: 'Sheridan, Wyoming',
  country: 'United States',
  publicPhone: null,
  // Header mark (no URL line). The full logo with URL is /assets/logo.png (738x524).
  logo: { src: '/assets/logo-mark.png', alt: 'Inspired by Christ', width: 193, height: 112 },
  socialLinks: [
    { label: 'Instagram', href: 'https://www.instagram.com/_inspiredbychrist_/' },
    { label: 'Facebook', href: 'https://www.facebook.com/inspiredbychrist.est2012' },
  ],
  appStoreUrl: null,
  googlePlayUrl: null,
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

/** True when the legal entity name differs from the brand name, ignoring a corporate suffix. */
export function namesDiffer(org: Organization = organization): boolean {
  if (!org.legalEntityName) return true;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[,.\s]+(inc|incorporated|llc|ltd|limited|corp|corporation|co)\.?$/, '')
      .replace(/[^a-z0-9]/g, '');
  return norm(org.legalEntityName) !== norm(org.brandName);
}
