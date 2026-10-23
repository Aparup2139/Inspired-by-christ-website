# Content required before launch

The website is built, but it will not deploy until these facts are supplied. Each one goes into [src/config/organization.ts](src/config/organization.ts). Until a fact is filled in:

- the site shows a yellow **"Content required: …"** notice where it belongs,
- `npm run audit:content` fails,
- the Render build fails, so the incomplete site is never published.

**Only enter facts that are true and approved for publication.** Do not use guesses, sample text, or "for now" wording. Whoever supplies a fact must be able to back it up with the evidence listed below.

## Essential facts (the audit fails without them)

| Field | What to supply | Where it must come from |
|---|---|---|
| `legalEntityName` | The exact registered name of the organization, including the suffix (e.g. "Ltd", "LLC", "Inc."). It must match the D‑U‑N‑S record you will use with Apple **character for character**. | Certificate of incorporation or registration; your D‑U‑N‑S record |
| `legalEntityType` | The real legal form and where it is registered, e.g. "Private limited company registered in India". Do not call it a nonprofit, charity, church, or ministry unless it is registered as one. | Registration documents |
| `brandRelationship` | One or two sentences on how the legal entity operates "Inspired by Christ", e.g. "Inspired by Christ is a brand operated by …". Required whenever the legal name is not "Inspired by Christ". | Your own accurate description |
| `organizationDescription` | A plain-language description of what the organization actually does. It appears in the homepage hero and on the About and Our Work pages. | Your own accurate description |
| `mission` | The organization's real mission, in its own words. | Your own accurate description |
| `organizationBackground` | Accurate background: why and when it was formed, and what it has done so far. No invented milestones, team, awards, or partners. | Your own records |
| `activities` | One or more real products, services, or projects, each with a title, a description, and an honest `status`: `active`, `available`, `in-development` (not yet released), or `planned`. If you are building an app for the App Store that has not shipped, use `in-development`. | What actually exists today |
| `contactEmail` | A working mailbox that someone monitors, ideally on `@inspired-by-christ.com`. Apple expects a work email on a domain associated with the organization. | Your email provider |
| `city`, `country` | Where the organization is based, at the level you are willing to publish (a street address is not required). | Registration documents |

## Optional facts

| Field | Notes |
|---|---|
| `publicPhone` | Only if it is a real business number approved for publication. Leave `null` to omit it. |
| `logo` | Only a genuine brand asset. Put the file in `public/assets/` and set `src`, `alt`, `width`, `height`. |
| `controlledEmailDomains` | Use this only if `contactEmail` is on a different domain the organization controls (for example a parent company's domain). Write down why that domain belongs to the organization. |

## Never publish

- The D‑U‑N‑S number
- Registration or tax numbers, unless you deliberately decide to publish them
- Home addresses
- Anything you cannot verify

## Also review before launch

- [src/pages/privacy.astro](src/pages/privacy.astro): the privacy notice describes the site as built (no cookies, no analytics, no forms, hosted on Render). If you add anything that collects data, update the notice and its date.
- The homepage heading "Inspired by Faith. Guided by Purpose." is a slogan from the brief. Change it if it does not suit the organization.

## Check your work

```bash
npm run build
npm run audit:content   # must print "Content audit passed"
npm run test:e2e        # content.spec.ts must pass too
```

The audit confirms that the facts are present and not placeholders. It cannot confirm they are **true**. A person with authority must read every page before launch (see [APPLE_VERIFICATION_CHECKLIST.md](APPLE_VERIFICATION_CHECKLIST.md), section B).
