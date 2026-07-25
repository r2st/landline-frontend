import { test, expect } from '@playwright/test';
import { authenticate, json, stubApi } from './helpers.js';

// The Dialtone kill switch (global sending pause) is embedded on the Console
// page. Pausing halts ALL outbound email, so it demands an explicit confirm.
test.describe('Kill switch', () => {
  test.beforeEach(async ({ page }) => {
    await stubApi(page);
    await authenticate(page);
    // Keep the Console shell happy.
    // `**` matters: the console is fetched with a `?timeframe=` param, and a
    // glob without it stops matching the moment that param appears.
    await page.route('**/api/v1/dialtone/console**', (route) => route.fulfill(json({})));
    await page.route('**/api/v1/dialtone/activity**', (route) => route.fulfill(json({ items: [], total: 0 })));
    // No active danger-signal trip → a clean manual pause path.
    await page.route('**/api/v1/dialtone/health/signals', (route) => route.fulfill(json({ active_trip: null })));
  });

  test('pauses all sending behind a confirmation', async ({ page }) => {
    let sendingEnabled = true;
    await page.route('**/api/v1/system/sending-status', (route) =>
      route.fulfill(json({ enabled: sendingEnabled, today_sent: 12, daily_limit: 50, warmup_week: null }))
    );
    await page.route('**/api/v1/system/sending-toggle', (route) => {
      sendingEnabled = false;
      return route.fulfill(json({ enabled: false, reason: 'Halted from dashboard', enrollments_affected: 3 }));
    });

    await page.goto('/dialtone');

    // Starts active.
    await expect(page.getByText('Dialtone active', { exact: true })).toBeVisible();

    // Pause → confirm.
    await page.getByRole('button', { name: /pause dialtone/i }).click();
    const toggleRequest = page.waitForRequest(
      (req) => req.url().includes('/system/sending-toggle') && req.method() === 'POST'
    );
    await page.getByRole('button', { name: /confirm halt/i }).click();

    // The pause request carried enabled:false.
    const req = await toggleRequest;
    expect(req.postDataJSON()).toMatchObject({ enabled: false });

    // And the banner now reports the paused state.
    await expect(page.getByText('Dialtone paused', { exact: true })).toBeVisible();
  });

  test('resumes a cleanly-paused switch', async ({ page }) => {
    let sendingEnabled = false;
    await page.route('**/api/v1/system/sending-status', (route) =>
      route.fulfill(json({ enabled: sendingEnabled, reason: 'Halted from dashboard' }))
    );
    await page.route('**/api/v1/system/sending-toggle', (route) => {
      sendingEnabled = true;
      return route.fulfill(json({ enabled: true, enrollments_affected: 3 }));
    });

    await page.goto('/dialtone');
    await expect(page.getByText('Dialtone paused', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /resume dialtone/i }).click();
    await expect(page.getByText('Dialtone active', { exact: true })).toBeVisible();
  });
});
