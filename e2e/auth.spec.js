import { test, expect } from '@playwright/test';
import { USER, json, stubApi } from './helpers.js';

test.describe('Authentication', () => {
  test('logs in and lands on the dashboard', async ({ page }) => {
    await stubApi(page);

    // The login POST issues the tokens; the follow-up /auth/me loads the profile.
    await page.route('**/api/v1/auth/login', (route) =>
      route.fulfill(json({ access_token: 'e2e-access', refresh_token: 'e2e-refresh', must_change_password: false }))
    );
    await page.route('**/api/v1/auth/me', (route) => route.fulfill(json(USER)));

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible();

    await page.getByLabel('Email').fill(USER.email);
    await page.getByLabel('Password').fill('correct-horse-battery-staple');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Redirected off /login into the authenticated shell.
    await expect(page).toHaveURL(/\/$|\/$/);
    await expect(page).not.toHaveURL(/\/login/);
    // The sidebar (only rendered inside the authenticated layout) is present.
    await expect(page.getByRole('link', { name: 'Landline home' })).toBeVisible();
  });

  test('shows an error on bad credentials and stays on /login', async ({ page }) => {
    await stubApi(page);
    await page.route('**/api/v1/auth/login', (route) =>
      route.fulfill(json({ detail: 'Incorrect email or password' }, 401))
    );

    await page.goto('/login');
    await page.getByLabel('Email').fill('wrong@apprend.tech');
    await page.getByLabel('Password').fill('nope');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('alert')).toContainText(/incorrect email or password/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects an unauthenticated visitor to /login', async ({ page }) => {
    await stubApi(page);
    await page.goto('/unified-inbox');
    await expect(page).toHaveURL(/\/login/);
  });
});
