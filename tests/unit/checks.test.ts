import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Organization } from '../../src/config/organization.ts';
import {
  contentWarnings,
  detectParking,
  findPlaceholders,
  hasNoindex,
  htmlToText,
  isValidEmail,
  validateOrganization,
} from '../../scripts/lib/checks.ts';

// Fictional fixture used only to exercise the validator; never shown on the site.
const complete: Organization = {
  brandName: 'Inspired by Christ',
  domain: 'inspired-by-christ.com',
  legalEntityName: 'Fixture Holdings LLC',
  legalEntityType: 'Limited liability company',
  brandRelationship: 'Inspired by Christ is a brand operated by Fixture Holdings LLC.',
  organizationDescription: 'A fixture organization that builds a devotional reading app.',
  mission: 'To make daily scripture reading simple and calm.',
  organizationBackground: 'Formed to develop and publish the reading app described here.',
  activities: [{ title: 'Reading app', description: 'A mobile app for daily reading plans.', status: 'in-development' }],
  contactEmail: 'hello@inspired-by-christ.com',
  controlledEmailDomains: [],
  city: 'Kolkata',
  country: 'India',
  publicPhone: null,
  logo: null,
};
const fields = (org: Organization) => validateOrganization(org).map((i) => i.field);

test('complete organization passes', () => {
  assert.deepEqual(validateOrganization(complete), []);
});

test('missing essential facts are reported', () => {
  const f = fields({ ...complete, legalEntityName: null, mission: '  ', activities: [], contactEmail: null });
  for (const expected of ['legalEntityName', 'mission', 'activities', 'contactEmail']) assert.ok(f.includes(expected), expected);
});

test('relationship is required only when names differ', () => {
  assert.ok(fields({ ...complete, brandRelationship: null }).includes('brandRelationship'));
  assert.ok(!fields({ ...complete, legalEntityName: 'Inspired By Christ', brandRelationship: null }).includes('brandRelationship'));
});

test('placeholder, trivial, and duplicated text is rejected', () => {
  assert.ok(fields({ ...complete, mission: 'TBD' }).includes('mission'));
  assert.ok(fields({ ...complete, organizationBackground: 'Lorem ipsum dolor sit amet' }).includes('organizationBackground'));
  assert.ok(fields({ ...complete, organizationDescription: 'Ministry' }).includes('organizationDescription'));
  assert.ok(fields({ ...complete, organizationBackground: complete.mission }).includes('organizationBackground'));
});

test('email validation', () => {
  assert.ok(isValidEmail('info@inspired-by-christ.com'));
  assert.ok(!isValidEmail('info@example.com'));
  assert.ok(!isValidEmail('not an email'));
  assert.ok(!isValidEmail('a@b'));
  assert.ok(fields({ ...complete, contactEmail: 'someone@example.org' }).includes('contactEmail'));
});

test('email on another domain warns unless documented', () => {
  assert.equal(contentWarnings({ ...complete, contactEmail: 'me@gmail.com' }).length, 1);
  assert.equal(contentWarnings({ ...complete, contactEmail: 'me@parent.com', controlledEmailDomains: ['parent.com'] }).length, 0);
  assert.equal(contentWarnings(complete).length, 0);
});

test('placeholder patterns', () => {
  assert.deepEqual(findPlaceholders('Our site is Under Construction'), ['Under Construction']);
  assert.ok(findPlaceholders('Content required: mission').length);
  assert.ok(findPlaceholders('[Company Name] builds apps').includes('[Company Name]'));
  assert.deepEqual(findPlaceholders('A calm app for daily reading, available today.'), []);
  assert.deepEqual(findPlaceholders('A mastodon toddler'), []);
});

test('htmlToText drops scripts, styles, and tags', () => {
  assert.equal(htmlToText('<style>a{}</style><p>Hi &amp; <b>there</b></p><script>TODO()</script>'), 'Hi & there');
});

test('detects the GoDaddy parking stub this domain served', () => {
  const stub = '<!DOCTYPE html><html><head><script>window.onload=function(){window.location.href="/lander"}</script></head></html>';
  assert.equal(detectParking(stub, ['Inspired by Christ']).parked, true);
});

test('detects parking wording without organization identity', () => {
  const html = '<h1>inspired-by-christ.com</h1><p>This domain is for sale. Get this domain.</p>';
  assert.equal(detectParking(html, ['Inspired by Christ', 'Fixture Holdings LLC']).parked, true);
});

test('incidental parking wording on the real site is not a false positive', () => {
  const html =
    '<h1>Inspired by Christ</h1><p>Operated by Fixture Holdings LLC.</p><p>We once saw a page saying "this domain is for sale".</p>';
  assert.equal(detectParking(html, ['Inspired by Christ', 'Fixture Holdings LLC']).parked, false);
});

test('parking infrastructure in headers is detected', () => {
  assert.equal(detectParking('<p>x</p>', ['x'], { 'set-cookie': 'lander_type=parkweb; Path=/' }).parked, true);
});

test('noindex detection', () => {
  assert.ok(hasNoindex('<meta name="robots" content="noindex, nofollow">'));
  assert.ok(hasNoindex('<p></p>', { 'X-Robots-Tag': 'noindex' }));
  assert.ok(!hasNoindex('<meta name="robots" content="index, follow">'));
});
