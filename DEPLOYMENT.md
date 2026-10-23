# Deployment: Render Static Site + GoDaddy DNS

Target: `https://inspired-by-christ.com` (canonical). `https://www.inspired-by-christ.com` redirects to it.

The site is static files only. Render builds it and serves `dist/`; no server process runs. Everything Render needs is in [render.yaml](render.yaml).

References (check them; details can change):
[Static sites](https://render.com/docs/static-sites) ·
[Custom domains](https://render.com/docs/custom-domains) ·
[Other DNS providers](https://render.com/docs/configure-other-dns) ·
[Redirects](https://render.com/docs/redirects-rewrites) ·
[Blueprint spec](https://render.com/docs/blueprint-spec)

> **The Render build fails until the content in [CONTENT_REQUIRED.md](CONTENT_REQUIRED.md) is supplied.** This is deliberate: the build command runs `npm run audit:content`, so an incomplete site cannot go live. Complete the content first and preview it locally with `npm run build && npm run preview`.

## 1. Push the repository to GitHub

```bash
git add -A
git commit -m "Inspired by Christ website"
git remote add origin https://github.com/<account>/inspired-by-christ.git
git push -u origin main
```

## 2–4. Create the Render Static Site from the Blueprint

1. Render Dashboard → **New** → **Blueprint**.
2. Connect GitHub and select the repository. Render reads `render.yaml`.
3. Review the service it proposes and apply it.

The Blueprint sets:

| Setting | Value |
|---|---|
| Service type | Static Site (`type: web`, `runtime: static`) |
| Build command | `npm ci && npm run build && npm run audit:content` |
| Publish directory | `./dist` |
| Node version | `NODE_VERSION=24` (also in `.node-version`) |
| Redirects | `/lander` and `/lander/*` → `/` (301) |
| Headers | CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS, long cache for `/_astro/*` |
| Custom domain | `inspired-by-christ.com` (Render adds `www` and redirects it to the root) |

**If you create the site by hand instead** (New → Static Site), enter the same build command and publish directory, then add the same redirect rules (Redirects/Rewrites tab) and headers (Headers tab) yourself. The live audit fails if the security headers are missing.

Render applies a redirect rule only when no file exists at that path. Never add a `lander` page to the site, or the `/lander` redirect stops working. The content audit and the e2e tests both check for this.

## 5. Deploy and inspect the preview URL

After the first successful deploy, Render shows a URL like `https://inspired-by-christ-xxxx.onrender.com`. Check it, then run:

```bash
npm run audit:live -- --url=https://inspired-by-christ-xxxx.onrender.com
```

Custom-domain checks report **BLOCKED** for an onrender.com URL; that is expected. All page, asset, `/lander`, and HTTPS checks should pass.

Deploying to onrender.com does **not** connect the custom domain. That happens in steps 6–10.

## 6. Add the root domain in Render

Service → **Settings** → **Custom Domains** → add `inspired-by-christ.com` (the Blueprint may already have added it). Render adds `www.inspired-by-christ.com` automatically and redirects it to the root. Leave the page open: it shows the exact DNS records to create.

## 7. Configure GoDaddy DNS

GoDaddy → **My Products** → `inspired-by-christ.com` → **DNS** → **DNS Records**.

**Before changing anything, take a screenshot or export of every existing record.**

Use the values the Render dashboard shows you. At the time of writing, Render's documentation specifies:

| Type | Name | Value | Action |
|---|---|---|---|
| `A` | `@` | `216.24.57.1` | Edit the existing `@` A record (currently GoDaddy's parking IPs `15.197.148.33` / `3.33.130.190`). Delete any second `@` A record so only Render's remains. |
| `CNAME` | `www` | `<your-service>.onrender.com` | Edit the existing `www` CNAME (currently `@`). |
| `AAAA` | `@`, `www` | n/a | **Delete if present.** Render uses IPv4, and AAAA records cause problems. |

GoDaddy's standard DNS does not offer ALIAS/ANAME records at the root, so use the `A` record.

**If there are CAA records**, add records for the certificate authorities Render's custom-domain documentation lists, or certificate issuance will fail.

### DNS safety: do not touch email or unrelated records

Leave these exactly as they are:

- `MX` records (mail delivery)
- `TXT` records for SPF (`v=spf1 …`), domain verification (Google, Microsoft, Apple, and so on)
- DKIM records (`TXT` or `CNAME`, usually named like `selector._domainkey`)
- `_dmarc` `TXT` record
- Email-related `CNAME`s such as `autodiscover`, `mail`, `email`, `webmail`
- `NS` and `SOA` records

Change only the `@` A record, the `www` CNAME, and any AAAA records.

**Records observed on 24 October 2026 (public DNS lookup). Keep all of these:**

| Type | Name | Value | Purpose |
|---|---|---|---|
| `MX` | `@` | `inspiredbychrist-com02j.mail.protection.outlook.com` (priority 0) | Microsoft 365 mail delivery |
| `TXT` | `@` | `v=spf1 include:secureserver.net -all` | SPF for GoDaddy-provisioned Microsoft 365 |
| `TXT` | `@` | `MS=ms70441762` | Microsoft domain verification |
| `TXT` | `@` | `NETORGFT21069980.onmicrosoft.com` | Microsoft 365 tenant verification |

No AAAA, CAA, or `_dmarc` records were found then. Microsoft 365 also usually needs `autodiscover` and DKIM (`selector1._domainkey`, `selector2._domainkey`) `CNAME` records. If they appear in GoDaddy, keep them too.

## 8. www hostname

Nothing extra is needed: Render serves `www` and redirects it to the root once the `www` CNAME from step 7 resolves.

## 9. Remove GoDaddy parking and forwarding

- GoDaddy → domain settings → **Forwarding**: remove any domain or subdomain forwarding. Forwarding overrides your DNS records.
- If GoDaddy offers a "parked" or "GoDaddy website" setting for the domain, turn it off. Any website product attached to the domain must be disconnected.

## 10. Verify domain and TLS in Render

Back on Custom Domains, click **Verify** for each domain. DNS changes can take from minutes up to 48 hours to propagate. When verification succeeds, Render issues and renews the TLS certificates automatically and redirects HTTP to HTTPS automatically.

To check propagation:

```bash
nslookup inspired-by-christ.com        # expect 216.24.57.1
nslookup www.inspired-by-christ.com    # expect a CNAME to *.onrender.com
```

## 11–13. Confirm the live site

```bash
npm run audit:live
```

This checks:

- DNS
- that the root no longer resolves to GoDaddy parking IPs
- TLS on both hostnames
- that `https://inspired-by-christ.com` shows the organization site, not the parking page
- `www` → root
- `http` → `https`
- `/lander` → `/` with a 301
- every page by direct URL
- CSS and JS loading
- security headers
- no `noindex`
- work-email DNS

It exits non-zero if anything fails or is blocked. Then open the site on a phone and a desktop, and click through every page.

## Rollback

Render keeps previous deploys: Service → **Events** → pick a deploy → **Rollback**. To return the domain to GoDaddy, restore the DNS records from your screenshot taken in step 7.
