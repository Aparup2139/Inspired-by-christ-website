// Test group D (browser): the rendered site carries real organization facts.
// These tests FAIL until src/config/organization.ts is completed; that is intended.
import { test, expect } from '@playwright/test';
import { organization as org, publicPaths } from '../../src/config/organization.ts';
import { findPlaceholders } from '../../scripts/lib/checks.ts';

for (const path of publicPaths) {
  test(`${path} has no missing facts or placeholder text`, async ({ page }) => {
    await page.goto(path);
    const missing = await page.locator('[data-missing]').evaluateAll((els) => els.map((e) => e.getAttribute('data-missing')));
    expect(missing, `unconfigured facts rendered on ${path}`).toEqual([]);
    expect(findPlaceholders(await page.locator('body').innerText())).toEqual([]);
  });
}

test('legal identity is published', async ({ page }) => {
  expect(org.legalEntityName, 'legalEntityName must be configured').toBeTruthy();
  for (const path of ['/', '/about/', '/contact/']) {
    await page.goto(path);
    await expect(page.locator('main')).toContainText(org.legalEntityName!);
  }
  await expect(page.getByRole('contentinfo')).toContainText(org.legalEntityName!);
});

test('contact email is published as a working mailto link', async ({ page }) => {
  expect(org.contactEmail, 'contactEmail must be configured').toBeTruthy();
  await page.goto('/contact/');
  await expect(page.locator('main a[href^="mailto:"]')).toHaveAttribute('href', `mailto:${org.contactEmail}`);
  await expect(page.getByRole('contentinfo').locator('a[href^="mailto:"]')).toHaveText(org.contactEmail!);
});

test('every configured activity is described on Our Work', async ({ page }) => {
  expect(org.activities.length, 'at least one real activity must be configured').toBeGreaterThan(0);
  await page.goto('/our-work/');
  for (const a of org.activities) await expect(page.getByRole('heading', { name: a.title, level: 2 })).toBeVisible();
});
