import { test, expect } from '@playwright/test';
import { authenticate, json, stubApi } from './helpers.js';

const THREADS = {
  threads: [
    {
      gmail_thread_id: 't1',
      subject: 'Re: pricing question',
      lead_name: 'Acme Co',
      lead_id: 'co-acme',
      last_activity: '2026-07-18T10:00:00Z',
      has_unread: true,
      provider: 'gmail',
      messages: [
        { id: 'm1', direction: 'sent', to_email: 'buyer@acme.com', body_text: 'Hi', timestamp: '2026-07-17T09:00:00Z' },
        { id: 'm2', direction: 'received', from_email: 'buyer@acme.com', body_text: 'What does it cost?', snippet: 'What does it cost?', timestamp: '2026-07-18T10:00:00Z' },
      ],
    },
  ],
  total: 1,
};

const REPLIES = {
  items: [
    {
      id: 'r1',
      subject: 'Re: quick question',
      contact_name: 'Dana Reed',
      from_email: 'dana@precision.com',
      snippet: "Yes, we're interested",
      received_at: '2026-07-19T12:00:00Z',
      is_read: false,
      priority_flag: true,
      reply_classification: 'interested',
    },
  ],
  total: 1,
};

test.describe('Unified Inbox', () => {
  test.beforeEach(async ({ page }) => {
    await stubApi(page);
    await authenticate(page);
    await page.route('**/api/v1/emails/inbox**', (route) => route.fulfill(json(THREADS)));
    await page.route('**/api/v1/dialtone/inbox**', (route) => {
      // The reply *detail* route is /dialtone/inbox/{id}; the list is /dialtone/inbox.
      if (/\/dialtone\/inbox\/[^/?]+/.test(route.request().url())) {
        return route.fulfill(json({ ...REPLIES.items[0], body_text: "Yes, we're interested",
          suggested_draft: { draft_reply: { subject: 'Re: quick question', body: 'Great — Thursday 2pm?' } } }));
      }
      return route.fulfill(json(REPLIES));
    });
  });

  test('merges both mailboxes into one list', async ({ page }) => {
    await page.goto('/unified-inbox');
    await expect(page.getByRole('heading', { name: /unified inbox/i })).toBeVisible();

    const list = page.getByRole('list');
    await expect(list.getByText('Dana Reed')).toBeVisible();
    await expect(list.getByText('Acme Co')).toBeVisible();
    // Mailbox pills identify each source.
    await expect(list.getByText('Dialtone')).toBeVisible();
    await expect(list.getByText('Gmail')).toBeVisible();
  });

  test('filters the list by mailbox', async ({ page }) => {
    await page.goto('/unified-inbox');
    await page.getByText('Dana Reed').waitFor();

    await page.getByRole('button', { name: 'Gmail', exact: true }).click();
    await expect(page.getByText('Acme Co')).toBeVisible();
    await expect(page.getByText('Dana Reed')).toHaveCount(0);
  });

  test('searches across mailboxes', async ({ page }) => {
    await page.goto('/unified-inbox');
    await page.getByText('Dana Reed').waitFor();

    await page.getByLabel(/search inbox/i).fill('pricing');
    await page.getByLabel(/search inbox/i).press('Enter');
    await expect(page.getByText('Acme Co')).toBeVisible();
    await expect(page.getByText('Dana Reed')).toHaveCount(0);
  });
});
