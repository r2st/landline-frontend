import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ACCESS_KEY = 'll_access_token';
const REFRESH_KEY = 'll_refresh_token';

// Import fresh so the module re-runs its load-time hydration against whatever we
// seeded into localStorage for that test.
async function importFreshStore() {
  vi.resetModules();
  return (await import('./authToken.js')).tokenStore;
}

describe('tokenStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('set', () => {
    it('stores access + refresh in memory and localStorage', async () => {
      const tokenStore = await importFreshStore();
      tokenStore.set('access-1', 'refresh-1');

      expect(tokenStore.getAccess()).toBe('access-1');
      expect(tokenStore.getRefresh()).toBe('refresh-1');
      expect(localStorage.getItem(ACCESS_KEY)).toBe('access-1');
      expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-1');
    });

    it('leaves the refresh token untouched when omitted', async () => {
      const tokenStore = await importFreshStore();
      tokenStore.set('access-1', 'refresh-1');
      tokenStore.set('access-2'); // no refresh arg

      expect(tokenStore.getAccess()).toBe('access-2');
      expect(tokenStore.getRefresh()).toBe('refresh-1');
      expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-1');
    });

    it('clears the persisted access token when set to null', async () => {
      const tokenStore = await importFreshStore();
      tokenStore.set('access-1', 'refresh-1');
      tokenStore.set(null);

      expect(tokenStore.getAccess()).toBeNull();
      expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
    });
  });

  describe('clear', () => {
    it('wipes both tokens from memory and localStorage', async () => {
      const tokenStore = await importFreshStore();
      tokenStore.set('access-1', 'refresh-1');
      tokenStore.clear();

      expect(tokenStore.getAccess()).toBeNull();
      expect(tokenStore.getRefresh()).toBeNull();
      expect(tokenStore.hasSession()).toBe(false);
      expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
      expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
    });
  });

  describe('hydrate on module load', () => {
    it('reads persisted tokens from localStorage', async () => {
      localStorage.setItem(ACCESS_KEY, 'persisted-access');
      localStorage.setItem(REFRESH_KEY, 'persisted-refresh');

      const tokenStore = await importFreshStore();

      expect(tokenStore.getAccess()).toBe('persisted-access');
      expect(tokenStore.getRefresh()).toBe('persisted-refresh');
      expect(tokenStore.hasSession()).toBe(true);
    });

    it('starts empty when nothing is persisted', async () => {
      const tokenStore = await importFreshStore();

      expect(tokenStore.getAccess()).toBeNull();
      expect(tokenStore.getRefresh()).toBeNull();
      expect(tokenStore.hasSession()).toBe(false);
    });
  });

  describe('refresh / logout handlers', () => {
    it('runRefresh resolves null when no handler is registered', async () => {
      const tokenStore = await importFreshStore();
      await expect(tokenStore.runRefresh()).resolves.toBeNull();
    });

    it('runRefresh delegates to the registered handler', async () => {
      const tokenStore = await importFreshStore();
      tokenStore.setRefreshHandler(async () => 'fresh-token');
      await expect(tokenStore.runRefresh()).resolves.toBe('fresh-token');
    });

    it('runLogout invokes the registered logout handler', async () => {
      const tokenStore = await importFreshStore();
      const onLogout = vi.fn();
      tokenStore.setLogoutHandler(onLogout);
      tokenStore.runLogout();
      expect(onLogout).toHaveBeenCalledTimes(1);
    });
  });
});
