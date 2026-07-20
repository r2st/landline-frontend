// Shared E2E helpers. The whole suite runs against the real Vite dev build with
// every API call mocked in-browser, so tests are deterministic and need no
// backend.

export const USER = {
  id: 'u-e2e',
  name: 'E2E Operator',
  email: 'operator@apprend.tech',
  role: 'admin',
  must_change_password: false,
};

// Fulfil a JSON response.
export function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

// Register a catch-all for /api/v1/* that returns an empty object, so any call a
// page makes that a test hasn't explicitly mocked resolves instantly instead of
// hanging on the (absent) backend proxy. Register this FIRST — Playwright
// matches routes last-registered-first, so per-test mocks added later win.
export async function stubApi(page) {
  await page.route('**/api/v1/**', (route) => route.fulfill(json({})));
}

// Seed a persisted session and answer the profile fetch, so gated routes render
// straight away instead of bouncing to /login. Call before navigating.
export async function authenticate(page, user = USER) {
  await page.addInitScript(() => {
    localStorage.setItem('ll_access_token', 'e2e-access-token');
    localStorage.setItem('ll_refresh_token', 'e2e-refresh-token');
  });
  await page.route('**/api/v1/auth/me', (route) => route.fulfill(json(user)));
}

// Convenience: mock a GET endpoint (matched by URL substring) with a JSON body.
export async function mockGet(page, urlPart, body) {
  await page.route(`**${urlPart}**`, (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill(json(body));
  });
}
