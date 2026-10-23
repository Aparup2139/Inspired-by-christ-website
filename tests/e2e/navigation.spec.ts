// Test group A: core functionality.
import { test, expect, type Page } from '@playwright/test';
import { organization, publicPaths, siteUrl } from '../../src/config/organization.ts';

const expectedH1: Record<string, string> = {
  '/': 'Inspired by Faith. Guided by Purpose.',
  '/about/': 'About Us',
  '/our-work/': 'Our Work',
  '/contact/': 'Contact',
  '/privacy/': 'Privacy Notice',
};

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

for (const path of publicPaths) {
  test(`${path} returns a complete, well-structured page`, async ({ page }) => {
    const errors = collectErrors(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    expect(res?.headers()['content-type']).toContain('text/html');

    await expect(page).toHaveTitle(new RegExp(organization.brandName));
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(expectedH1[path]);
    await expect(page.locator('h1')).toBeVisible();

    await expect(page.locator('header')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('footer')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeAttached();
    await expect(page.locator('main p').first()).toBeVisible();

    // Headings start at h1 and never skip a level.
    const levels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `heading order ${levels}`).toBeLessThanOrEqual(1);

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.trim().length).toBeGreaterThan(20);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new URL(path, siteUrl).href);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    expect(await page.locator('html').getAttribute('lang')).toBe('en');

    // The Content-Security-Policy in render.yaml forbids inline scripts and styles.
    await expect(page.locator('script:not([src])')).toHaveCount(0);
    await expect(page.locator('style, [style]')).toHaveCount(0);

    expect(errors).toEqual([]);
  });
}

test('page titles are unique', async ({ page }) => {
  const titles = [];
  for (const path of publicPaths) {
    await page.goto(path);
    titles.push(await page.title());
  }
  expect(new Set(titles).size).toBe(titles.length);
});

test('header navigation links reach each page', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const [name, path] of [
    ['About', '/about/'],
    ['Our Work', '/our-work/'],
    ['Contact', '/contact/'],
    ['Home', '/'],
  ]) {
    await nav.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(path);
    await expect(page.locator('h1')).toHaveText(expectedH1[path]);
    await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page');
  }
});

test('footer links reach each page', async ({ page }) => {
  for (const [name, path] of [
    ['Home', '/'],
    ['About', '/about/'],
    ['Our Work', '/our-work/'],
    ['Contact', '/contact/'],
    ['Privacy Notice', '/privacy/'],
  ]) {
    await page.goto('/contact/');
    await page.getByRole('contentinfo').getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(path);
    await expect(page.locator('h1')).toHaveText(expectedH1[path]);
  }
});

test('no broken internal links or assets', async ({ page, request, baseURL }) => {
  const targets = new Set<string>();
  for (const path of publicPaths) {
    await page.goto(path);
    const refs = await page
      .locator('a[href], link[href], script[src], img[src]')
      .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href || (e as HTMLScriptElement).src));
    for (const ref of refs) {
      const url = new URL(ref);
      if (url.origin === baseURL) targets.add(url.pathname);
    }
  }
  expect(targets.size).toBeGreaterThan(publicPaths.length);
  for (const t of targets) {
    const res = await request.get(t);
    expect(res.status(), t).toBe(200);
  }
});

test('external links are safe', async ({ page, baseURL }) => {
  for (const path of publicPaths) {
    await page.goto(path);
    const links = await page.locator('a[href^="http"]').evaluateAll((els) =>
      els.map((e) => ({ href: (e as HTMLAnchorElement).href, rel: e.getAttribute('rel') ?? '', target: e.getAttribute('target') })),
    );
    for (const l of links.filter((l) => new URL(l.href).origin !== baseURL)) {
      expect(l.href.startsWith('https://'), l.href).toBe(true);
      expect(l.rel, l.href).toContain('noopener');
    }
  }
});

test('unknown paths return the 404 page', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist/');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Page Not Found');
  await expect(page.getByRole('link', { name: 'Return to the homepage' })).toHaveAttribute('href', '/');
});

test('no /lander file exists, so the Render redirect rule applies', async ({ request }) => {
  // Locally there is no redirect (Render applies it), so the path must simply not exist in the build.
  expect((await request.get('/lander')).status()).toBe(404);
});

test('sitemap and robots.txt expose every public page', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const p of publicPaths) expect(xml).toContain(`<loc>${new URL(p, siteUrl).href}</loc>`);
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain(`Sitemap: ${siteUrl}/sitemap.xml`);
  expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m);
});

test('content and navigation are available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link', { name: 'About', exact: true })).toBeVisible();
  await expect(page.locator('.menu-toggle')).toBeHidden();
  await context.close();
});
