// Test group C: accessibility. Automated checks catch only part of WCAG; see README.md.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { publicPaths } from '../../src/config/organization.ts';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze();
  return violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

for (const path of publicPaths) {
  test(`axe: ${path} has no detectable violations (desktop)`, async ({ page }) => {
    await page.goto(path);
    expect(await axe(page)).toEqual([]);
  });

  test(`axe: ${path} has no detectable violations (mobile, menu open)`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(path);
    await page.locator('.menu-toggle').click();
    expect(await axe(page)).toEqual([]);
  });
}

/** Returns a description of the focused element and whether its focus indicator is visible. */
const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      text: el.textContent?.trim() ?? '',
      tag: el.tagName,
      inFooter: Boolean(el.closest('footer')),
      inMain: Boolean(el.closest('main')),
      indicator: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2,
      onScreen: r.width > 0 && r.height > 0 && r.top >= 0 && r.left >= 0,
    };
  });

test('keyboard: skip link is first and moves focus to main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const first = await focused(page);
  expect(first.text).toBe('Skip to main content');
  expect(first.indicator && first.onScreen).toBe(true);
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('main');
  await page.keyboard.press('Tab');
  expect((await focused(page)).inMain).toBe(true);
});

test('keyboard: every focusable element shows a visible focus indicator and focus reaches the footer', async ({ page }) => {
  for (const path of publicPaths) {
    await page.goto(path);
    const count = await page.locator('a[href], button:not([hidden])').count();
    const seen: string[] = [];
    let reachedFooterEnd = false;
    for (let i = 0; i < count + 2; i++) {
      await page.keyboard.press('Tab');
      const f = await focused(page);
      if (f.tag === 'BODY') break;
      expect(f.indicator, `${path}: no focus indicator on "${f.text}"`).toBe(true);
      seen.push(f.text);
      if (f.inFooter && f.text === 'Privacy Notice') reachedFooterEnd = true;
    }
    expect(reachedFooterEnd, `${path}: focus never reached the footer (${seen.join(' | ')})`).toBe(true);
    for (const name of ['Home', 'About', 'Our Work', 'Contact']) expect(seen).toContain(name);
  }
});

test('keyboard: mobile menu exposes and manages its state', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Menu' });
  await expect(toggle).toHaveAttribute('aria-controls', 'site-nav');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const about = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About', exact: true });
  await expect(about).toBeVisible();

  await page.keyboard.press('Tab');
  expect((await focused(page)).text).toBe('Home');

  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await expect(about).toBeHidden();

  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('images have alt text and the document declares its language', async ({ page }) => {
  for (const path of publicPaths) {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('img:not([alt])')).toHaveCount(0);
  }
});
