# Test report: 24 October 2026

These are the results of the full command sequence from a clean `npm ci`. Environment: Windows 11, Node 24.3.0, Astro 7.4, Playwright 1.64 (Chromium).

## Summary

| Command | Exit | Result |
|---|---|---|
| `npm ci` | 0 | **PASS** |
| `npm run lint` | 0 | **PASS** |
| `npm run typecheck` | 0 | **PASS**: 0 errors, 0 warnings |
| `npm run build` | 0 | **PASS**: 5 pages, plus 404 and sitemap |
| `npm run test` | 0 | **PASS**: 13/13 unit tests |
| `npm run test:e2e` | 1 | 36 **PASS**, 8 **FAIL** (all in `content.spec.ts`: content not supplied) |
| `npm run audit:content` | 1 | **FAIL**: 10 organization facts missing |
| `npm run audit:live` | 1 | **FAIL**: the domain still serves the GoDaddy parking page |

## By test group

| Group | Status | Detail |
|---|---|---|
| A: Core functionality | **PASS** | All 5 pages return 200 with a single correct h1, landmarks, ordered headings, canonical URL, and meta description. Also verified: unique titles, header and footer links, no broken internal links or assets, safe external links, 404 page, sitemap and robots, works without JS, no inline scripts or styles, no console errors. |
| B: Responsive layout | **PASS** | 7 viewports. Each one opens the homepage, then navigates to every page through the header, mobile menu, or footer. No overflow, no elements outside the viewport, no text spilling from its box, h1 not under the header, all targets ≥ 24px, body text ≥ 16px. A long-email wrapping test also passes. Screenshots for manual review: `test-results/screenshots/` (reviewed at 320 and 1440px). |
| C: Accessibility | **PASS** | axe: 0 violations on 5 pages × (desktop, mobile with menu open). Keyboard: skip link, visible focus on every focusable element, focus reaches the footer, and the mobile menu's `aria-expanded`, Escape, and focus return all work. See README.md for the limits of automated testing. |
| D: Content readiness | **BLOCKED** (tests executed and failed) | `content.spec.ts` (8 tests) and `audit:content` fail because `legalEntityName`, `legalEntityType`, `brandRelationship`, `organizationDescription`, `mission`, `organizationBackground`, `activities`, `contactEmail`, `city`, and `country` are not configured. **Next action:** supply them (CONTENT_REQUIRED.md). |
| E: Registrar parking detection (live) | **FAIL** | `https://inspired-by-christ.com` returns GoDaddy's `window.location.href="/lander"` parking stub. `www`, `http`→`https`, and `/lander` all serve GoDaddy pages, and all 8 direct page URLs show parking. **Next action:** deploy on Render and switch DNS (DEPLOYMENT.md steps 2–10), then re-run `npm run audit:live`. |
| F: Domain and email | Partial | **PASS**: DNS resolves for both hostnames; no AAAA or CAA records that would block Render. **FAIL**: the root A records are GoDaddy parking IPs (`15.197.148.33`, `3.33.130.190`), not Render. **PASS (observed)**: Microsoft 365 MX and SPF records exist for the domain. **BLOCKED**: email-domain match, because `contactEmail` is not set. **MANUAL**: the inbox works, and the organization owns the domain. |
| G: Production build | **PASS** | All build and quality commands pass. The failing commands are content and live checks that fail honestly, not software defects. |

## Pass-path verification

To show the suite passes once real content exists, `organization.ts` was temporarily filled with an obviously fictional fixture. With it, `npm run build`, `npm run audit:content` (25/25), and `npm run test:e2e` (44/44) all passed, and the layout was reviewed at 320px with realistic text lengths. The real (empty) config was then restored. Nothing from the fixture is in the repository.

## Outstanding blockers

1. **Content:** supply the real organization facts. This blocks the Render build by design.
2. **Deployment:** create the Render service from `render.yaml`. This needs your GitHub and Render accounts.
3. **DNS:** change the GoDaddy `@` A record and the `www` CNAME, and remove forwarding. This needs your GoDaddy account. Keep the Microsoft 365 MX and TXT records.
4. **Live verification:** `npm run audit:live` must pass after steps 1–3.
5. **Manual checks:** APPLE_VERIFICATION_CHECKLIST.md, section B.
