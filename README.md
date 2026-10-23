# Inspired by Christ: organization website

A static Astro site for `https://inspired-by-christ.com`, hosted as a Render Static Site. It has no backend, database, forms, cookies, analytics, or third-party requests.

## Quick start

```bash
npm ci
npm run dev            # http://localhost:4321 with live reload
npm run build          # production output in dist/
npm run preview        # serve dist/ locally
```

Node 22.23 or later is required. Node 24 is pinned in `.node-version`.

## Organization content

Every organization fact lives in [src/config/organization.ts](src/config/organization.ts). Unknown values stay `null`. The site then shows a visible **"Content required"** notice, the content audit fails, and the Render build refuses to deploy. See [CONTENT_REQUIRED.md](CONTENT_REQUIRED.md) for what each field needs. Do not invent values to make the checks pass.

## Scripts

| Command | What it does |
|---|---|
| `npm run lint` | ESLint (TypeScript and Astro) |
| `npm run typecheck` | `astro check`: type-checks `src/`, `scripts/`, and `tests/` |
| `npm run build` | Static build to `dist/` |
| `npm run test` | Unit tests for the validators and parking detector (`node --test`) |
| `npm run test:e2e` | Playwright against the production build served by `astro preview`. Run `npx playwright install chromium` once first. |
| `npm run audit:content` | Release-readiness audit of the config and `dist/`. Non-zero exit if anything is missing. |
| `npm run audit:live` | Live checks of the domain: DNS, TLS, redirects, parking detection, pages, assets, headers, email DNS. Use `-- --url=https://…` for another host, or set `LIVE_URL`. |

All commands exit non-zero on failure.

## Tests

`tests/e2e/`:

- `navigation.spec.ts` (Core functionality): status codes, titles, landmarks, heading order, header and footer links, internal link crawl, 404 page, sitemap and robots, no-JS rendering, CSP compatibility (no inline scripts or styles).
- `responsive.spec.ts` (Responsive layout): 320, 375, 390, 768, 1024, 1440, and 1920px. Checks overflow, elements outside the viewport, text spilling from its box, content hidden under the header, WCAG 2.2 target size, and mobile-menu operation. Full-page screenshots go to `test-results/screenshots/` for manual review; the screenshots themselves are not assertions.
- `accessibility.spec.ts` (Accessibility): axe-core on every page (desktop, and mobile with the menu open), skip link, visible focus indicator on every focusable element, no keyboard trap, and menu `aria-expanded`/Escape handling.
- `content.spec.ts` (Content readiness): fails until real content is configured. This is intended.

`tests/unit/checks.test.ts` covers the validators and the parking-page detector, including the exact GoDaddy stub this domain served and a false-positive case.

### Limits of automated accessibility testing

axe-core finds only a subset of WCAG issues, roughly a third to a half. It cannot judge:

- whether link text and headings make sense
- reading order
- screen-reader experience
- zoom or reflow at 400%
- how understandable the content is

Before launch, test by hand:

- keyboard only
- a screen reader (NVDA, VoiceOver)
- browser zoom at 200% and 400%
- Windows High Contrast mode

## Structure

```text
src/config/organization.ts   all organization facts (single source of truth)
src/components/              Header, Footer, Fact (value or "Content required"), Email
src/layouts/BaseLayout.astro document shell, meta, canonical
src/pages/                   index, about, our-work, contact, privacy, 404, sitemap.xml
src/styles/global.css        design tokens and styles
public/js/menu.js            the only script: mobile menu toggle
scripts/                     audit-content.ts, audit-live.ts, lib/checks.ts
tests/                       e2e/ (Playwright), unit/ (node:test)
render.yaml                  Render Blueprint: build, publish dir, redirects, headers, domain
```

## Deployment and enrollment

- [DEPLOYMENT.md](DEPLOYMENT.md): Render and GoDaddy DNS, step by step
- [APPLE_VERIFICATION_CHECKLIST.md](APPLE_VERIFICATION_CHECKLIST.md): what is verified, and what needs a person or Apple
- [TEST_REPORT.md](TEST_REPORT.md): latest test results
