# Apple Developer Program: organization enrollment readiness

This checklist tracks what the website and domain can show Apple. **Passing every item here does not mean Apple will approve the enrollment.** Apple verifies the organization's legal status, D‑U‑N‑S record, and the applicant's authority on its own.

Apple's published sources:

- [Program enrollment](https://developer.apple.com/help/account/membership/program-enrollment/)
- [Enroll](https://developer.apple.com/programs/enroll/)
- [Identity verification](https://developer.apple.com/help/account/membership/identity-verification/)

Apple's stated requirements for the organization website:

1. It is publicly accessible.
2. It is functional.
3. Its domain is associated with the organization.
4. It is not just minimal or placeholder content.
5. It is not a registrar parking page or a social media page.

Apple also requires:

- legal entity status
- a D‑U‑N‑S number (subject to Apple's exceptions)
- a work email on a domain associated with the organization
- legal signing authority

The About page, the privacy notice, and the published contact details are **our** choices to make the site credible. Apple does not require them.

Status key:

- **PASS**: verified, with evidence.
- **FAIL**: checked and not met.
- **BLOCKED**: cannot be checked yet.
- **MANUAL**: a person must confirm it.

Status as of 24 October 2026:

## A. Automatically testable (`npm run test:e2e`, `npm run audit:content`, `npm run audit:live`)

| Requirement | Status | Evidence / next action |
|---|---|---|
| Public website availability at `https://inspired-by-christ.com` | **FAIL** | Live audit: the domain still serves the GoDaddy parking stub (`window.location.href="/lander"`). Deploy, then follow DEPLOYMENT.md steps 6–10. |
| HTTPS accessibility | **FAIL** | A GoDaddy certificate is valid today, but it serves the parking page. Render issues the certificate after DNS is connected. Re-run `npm run audit:live`. |
| Functional navigation | **PASS** (local build) | Header, footer, mobile menu, and internal-link tests pass. Must be confirmed live by `audit:live`. |
| Real content present | **FAIL** | `audit:content`: 10 essential facts are missing. See CONTENT_REQUIRED.md. |
| Correct domain / canonical | **PASS** (local build) | Canonical URLs and sitemap use `https://inspired-by-christ.com`. Live check pending. |
| Correct redirects (`www` → root, `http` → `https`, `/lander` → `/`) | **BLOCKED** | Configured in render.yaml and Render. Can only be verified once the domain points at Render. |
| No registrar parking page | **FAIL** | Parking page detected live. Clears after the DNS change. |
| No unfinished placeholder pages | **FAIL** | "Content required" notices are shown until the content is supplied. The Render build refuses to deploy until then. |
| Responsive layout (320–1920px) | **PASS** | 7 viewports × 5 pages: no overflow, clipping, or undersized targets. Screenshots are in `test-results/screenshots/`. |
| Basic accessibility checks | **PASS** | axe (WCAG 2.0/2.1/2.2 A/AA plus best practice) finds no violations on any page at desktop or mobile. Keyboard tests pass. |

## B. Human-verifiable website details

| Item | Status | What to confirm |
|---|---|---|
| Exact legal entity name | **MANUAL** | Matches the registration documents and the D‑U‑N‑S record exactly. |
| Genuine organization description | **MANUAL** | Describes what the organization really does today. |
| Brand / legal-entity relationship | **MANUAL** | The relationship statement is accurate. |
| Organization owns or controls the domain | **MANUAL** | The GoDaddy account and registration belong to, or are held for, the legal entity. |
| Published contact details are accurate | **MANUAL** | The email and location on the site are correct. |
| Work email is active | **MANUAL** | Mail for the domain is already handled by Microsoft 365 (MX record found). Send a test message to the published address from an outside account and confirm it arrives and gets a reply. |
| Content reflects actual activities | **MANUAL** | Each activity's status (`in-development`, `available`, and so on) is honest. |

## C. Apple-only enrollment checks (cannot be verified or guaranteed by any website test)

| Item | Status |
|---|---|
| Legal entity eligibility | **MANUAL: Apple** |
| D‑U‑N‑S verification (where required) | **MANUAL: Apple**. The legal name on the site should match the D‑U‑N‑S record. |
| Registered business information | **MANUAL: Apple** |
| Applicant's legal signing authority | **MANUAL: Apple** |
| Identity verification | **MANUAL: Apple** |
| Any additional documents Apple requests | **MANUAL: Apple** |

## Ready to submit when

- [ ] `npm run audit:content` passes, with real content
- [ ] `npm run test:e2e` passes, including `content.spec.ts`
- [ ] `npm run audit:live` passes, with no FAIL or BLOCKED
- [ ] Every item in section B has been confirmed by a person with authority
- [ ] The website URL submitted to Apple is `https://inspired-by-christ.com`, not the `/lander` address submitted earlier
