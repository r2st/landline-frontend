import { test, expect } from '@playwright/test';
import { authenticate, json, stubApi } from './helpers.js';

// A "campaign" here is a multi-step outreach sequence, created in the Sequences
// builder and persisted via POST /outreach/sequences.
test.describe('Campaign creation', () => {
  test.beforeEach(async ({ page }) => {
    await stubApi(page);
    await authenticate(page);
    await page.route('**/api/v1/outreach/sequences', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill(json([])); // start with no sequences
      }
      return route.fallback();
    });
  });

  test('creates a new sequence from the builder', async ({ page }) => {
    await page.goto('/sequences');

    // Open the builder (empty state and header both expose "Create Sequence").
    await page.getByRole('button', { name: /create sequence/i }).first().click();
    await expect(page.getByRole('heading', { name: /create new sequence/i })).toBeVisible();

    // Name + first step subject are required by the builder's validation.
    await page.getByPlaceholder(/cold outreach - q2 campaign/i).fill('E2E Launch Campaign');
    await page.getByPlaceholder(/email subject line/i).first().fill('Quick question about {{company}}');
    await page.getByPlaceholder(/email body text/i).first().fill('Hi {{first_name}}, worth a chat?');

    // Intercept the create and assert the payload.
    const createRequest = page.waitForRequest(
      (req) => req.url().includes('/outreach/sequences') && req.method() === 'POST'
    );
    await page.route('**/api/v1/outreach/sequences', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill(json({ id: 'seq-new', name: 'E2E Launch Campaign', steps: [] }));
      }
      return route.fulfill(json([]));
    });

    await page.getByRole('button', { name: /save sequence/i }).click();

    const req = await createRequest;
    expect(req.postDataJSON()).toMatchObject({ name: 'E2E Launch Campaign' });
  });
});
