import { test, expect } from '@playwright/test';
import { authenticate, json } from './helpers.js';

// Contact enrollment: from a company's Outreach tab, enrol a contact into a
// sequence via POST /outreach/enrollments.
const COMPANY = { id: 'co-1', name: 'Cleveland Precision', domain: 'clevelandprecision.com', stage: 'outreach' };
const CONTACTS = [
  { id: 'ct-1', first_name: 'Dana', last_name: 'Reed', email: 'dana@clevelandprecision.com', is_primary: true },
];
const SEQUENCES = [
  { id: 'seq-1', name: 'Cold Outreach Q3', steps: [{ order: 1 }, { order: 2 }] },
];

test.describe('Contact enrollment', () => {
  test.beforeEach(async ({ page }) => {
    // CompanyDetail fans out to many list endpoints (scores, deals, news, health,
    // email sends…). An empty array is the safe default for all of them — an
    // empty object would break the `.map`s and trip the error boundary. The few
    // object-shaped endpoints (company, /auth/me) are mocked explicitly below.
    await page.route('**/api/v1/**', (route) => route.fulfill(json([])));
    await authenticate(page);
    await page.route('**/api/v1/companies/co-1', (route) => route.fulfill(json(COMPANY)));
    await page.route('**/api/v1/contacts/company/co-1', (route) => route.fulfill(json(CONTACTS)));
    await page.route('**/api/v1/outreach/sequences', (route) => route.fulfill(json(SEQUENCES)));
  });

  test('enrols a contact into a sequence', async ({ page }) => {
    await page.goto('/companies/co-1');
    await expect(page.getByRole('heading', { name: /cleveland precision/i })).toBeVisible();

    // Move to the Outreach tab where the enrol menu lives (scoped to main —
    // the sidebar also has an "Outreach" section toggle).
    await page.getByRole('main').getByRole('button', { name: 'Outreach', exact: true }).click();

    // Open the sequence dropdown.
    await page.getByRole('button', { name: /enroll in sequence/i }).click();
    await expect(page.getByText('Cold Outreach Q3')).toBeVisible();

    // Enrol → assert the POST payload.
    const enrollRequest = page.waitForRequest(
      (req) => req.url().includes('/outreach/enrollments') && req.method() === 'POST'
    );
    await page.route('**/api/v1/outreach/enrollments', (route) =>
      route.fulfill(json({ id: 'enr-1', contact_id: 'ct-1', sequence_id: 'seq-1', status: 'active' }))
    );
    await page.getByRole('button', { name: /cold outreach q3/i }).click();

    const req = await enrollRequest;
    expect(req.postDataJSON()).toMatchObject({ contact_id: 'ct-1', sequence_id: 'seq-1' });
  });
});
