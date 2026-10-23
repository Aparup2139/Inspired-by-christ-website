// Test group B: responsive layout. Screenshots are saved for manual review only;
// the assertions below are what detect layout regressions.
import { test, expect, type Page } from '@playwright/test';

const viewports = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];
const MOBILE_MAX = 767; // matches the 47.99em breakpoint in global.css

const pages = [
  { path: '/about/', link: 'About', region: 'header' },
  { path: '/our-work/', link: 'Our Work', region: 'header' },
  { path: '/contact/', link: 'Contact', region: 'header' },
  { path: '/privacy/', link: 'Privacy Notice', region: 'footer' },
  { path: '/', link: 'Home', region: 'header' },
] as const;

async function assertLayout(page: Page, label: string) {
  const width = page.viewportSize()!.width;

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${label}: horizontal overflow`).toBeLessThanOrEqual(0);

  // No visible element extends beyond the viewport horizontally.
  const outside = await page.evaluate((vw) => {
    const out: string[] = [];
    for (const el of document.body.querySelectorAll<HTMLElement>('*')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue;
      if (el.classList.contains('skip-link')) continue;
      if (r.left < -1 || r.right > vw + 1) out.push(`${el.tagName}.${el.className} [${Math.round(r.left)}, ${Math.round(r.right)}]`);
    }
    return out;
  }, width);
  expect(outside, `${label}: elements outside viewport`).toEqual([]);

  // Text blocks never spill out of their own box (clipped or overlapping text).
  const spilled = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('h1, h2, h3, p, dd, dt, li, .button, .brand, .menu-toggle')]
      .filter((el) => el.getClientRects().length && el.scrollWidth > el.clientWidth + 1)
      .map((el) => `${el.tagName}: ${el.textContent?.trim().slice(0, 40)}`),
  );
  expect(spilled, `${label}: text wider than its container`).toEqual([]);

  // Content is not hidden behind the header.
  const header = await page.locator('header').boundingBox();
  const h1 = page.locator('h1');
  await expect(h1).toBeVisible();
  expect((await h1.boundingBox())!.y, `${label}: h1 under header`).toBeGreaterThanOrEqual(header!.y + header!.height);

  // Interactive targets meet WCAG 2.2 target size minimum (24x24 CSS px).
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('header a, header button, .button, footer li a')]
      .filter((el) => el.getClientRects().length)
      .map((el) => ({ text: el.textContent?.trim(), r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 24 || r.height < 24)
      .map(({ text, r }) => `${text} ${Math.round(r.width)}x${Math.round(r.height)}`),
  );
  expect(small, `${label}: undersized touch targets`).toEqual([]);

  // Body text stays readable (labels such as the eyebrow are intentionally smaller).
  const fontSize = await page.locator('main p:not(.eyebrow, .kicker, .status)').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(16);
}

for (const vp of viewports) {
  test(`layout and navigation at ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto('/');
    const mobile = vp.width <= MOBILE_MAX;
    const toggle = page.locator('.menu-toggle');
    const nav = page.getByRole('navigation', { name: 'Main' });

    if (mobile) {
      await expect(toggle).toBeVisible();
      await expect(nav.getByRole('link', { name: 'About', exact: true })).toBeHidden();
    } else {
      await expect(toggle).toBeHidden();
      await expect(nav.getByRole('link', { name: 'About', exact: true })).toBeVisible();
    }
    await assertLayout(page, `${vp.width} /`);
    await page.screenshot({ path: `test-results/screenshots/${vp.width}x${vp.height}-home.png`, fullPage: true });

    for (const p of pages) {
      if (p.region === 'header') {
        if (mobile) {
          await toggle.click();
          await expect(toggle).toHaveAttribute('aria-expanded', 'true');
          await assertLayout(page, `${vp.width} menu open`);
        }
        await nav.getByRole('link', { name: p.link, exact: true }).click();
      } else {
        await page.getByRole('contentinfo').getByRole('link', { name: p.link, exact: true }).click();
      }
      await expect(page).toHaveURL(p.path);
      if (mobile) await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await assertLayout(page, `${vp.width} ${p.path}`);
      const slug = p.path === '/' ? 'home-return' : p.path.replaceAll('/', '');
      await page.screenshot({ path: `test-results/screenshots/${vp.width}x${vp.height}-${slug}.png`, fullPage: true });
    }
  });
}

test('long email addresses wrap instead of overflowing', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/contact/');
  // Simulate the longest plausible address in every email slot.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('.email, [data-missing="contactEmail"]'))
      el.textContent = 'organization.relations.department@inspired-by-christ.com';
  });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
