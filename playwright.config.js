import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config.
 *
 * The suite is hermetic: every /api/v1/* call is intercepted in-browser (see
 * e2e/helpers.js), so no backend is required. Playwright boots the Vite dev
 * server itself and drives it. Vitest owns unit/component tests under src/**;
 * these live in e2e/ so the two runners never collide.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
