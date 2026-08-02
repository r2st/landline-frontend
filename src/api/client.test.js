import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from './client';
import { tokenStore } from './authToken';
import { impersonationStore } from './impersonation';

// Drive the axios instance through a fake adapter so we can script server
// responses (401 then 200) and inspect exactly what the response interceptor
// replays.
function installAdapter(handler) {
  api.defaults.adapter = async (config) => handler(config);
}

function axios401(config) {
  return Promise.reject({
    config,
    response: { status: 401, data: { detail: 'expired' } },
    isAxiosError: true,
  });
}

function axios200(config, data = { ok: true }) {
  return { data, status: 200, statusText: 'OK', headers: {}, config };
}

describe('api response interceptor — 401 → refresh → replay', () => {
  beforeEach(() => {
    tokenStore.clear();
    tokenStore.setRefreshHandler(null);
    tokenStore.setLogoutHandler(null);
    delete api.defaults.adapter;
  });

  it('refreshes the token and replays the original request with the new bearer', async () => {
    const seenHeaders = [];
    installAdapter((config) => {
      seenHeaders.push(config.headers?.Authorization);
      if (config._retry) return axios200(config);
      return axios401(config);
    });

    const refresh = vi.fn(async () => {
      tokenStore.set('new-access-token');
      return 'new-access-token';
    });
    tokenStore.setRefreshHandler(refresh);

    const res = await api.get('/companies/');

    expect(res.data).toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    // Two round-trips: the original 401 and the replay.
    expect(seenHeaders).toHaveLength(2);
    // The replayed request carries the refreshed bearer token.
    expect(seenHeaders[1]).toBe('Bearer new-access-token');
  });

  it('logs out and rejects when the refresh fails', async () => {
    installAdapter((config) => axios401(config));

    const refresh = vi.fn(async () => null); // refresh impossible
    const logout = vi.fn();
    tokenStore.setRefreshHandler(refresh);
    tokenStore.setLogoutHandler(logout);

    await expect(api.get('/companies/')).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('does not attempt a second refresh on a replay that also 401s', async () => {
    let calls = 0;
    installAdapter((config) => {
      calls += 1;
      return axios401(config); // always 401, even the replay
    });

    const refresh = vi.fn(async () => 'still-bad-token');
    const logout = vi.fn();
    tokenStore.setRefreshHandler(refresh);
    tokenStore.setLogoutHandler(logout);

    await expect(api.get('/companies/')).rejects.toMatchObject({
      response: { status: 401 },
    });
    // Original + one replay only — the _retry guard stops an infinite loop.
    expect(calls).toBe(2);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('skips refresh for requests flagged _skipAuthRefresh (auth endpoints)', async () => {
    installAdapter((config) => axios401(config));

    const refresh = vi.fn(async () => 'token');
    tokenStore.setRefreshHandler(refresh);

    await expect(
      api.post('/auth/login', {}, { _skipAuthRefresh: true })
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('api request interceptor — auth headers', () => {
  beforeEach(() => {
    tokenStore.clear();
    delete api.defaults.adapter;
  });

  it('attaches the bearer token when logged in', async () => {
    tokenStore.set('abc-123');
    let seen;
    installAdapter((config) => {
      seen = config.headers?.Authorization;
      return axios200(config);
    });

    await api.get('/dashboard/overview');
    expect(seen).toBe('Bearer abc-123');
  });

  it('omits the bearer token when logged out', async () => {
    let seen = 'unset';
    installAdapter((config) => {
      seen = config.headers?.Authorization;
      return axios200(config);
    });

    await api.get('/dashboard/overview');
    expect(seen).toBeUndefined();
  });
});

describe('api response interceptor — 403 organization deactivated', () => {
  beforeEach(() => {
    tokenStore.clear();
    tokenStore.setLogoutHandler(null);
    impersonationStore.clear();
    delete api.defaults.adapter;
  });

  function axios403(config, detail) {
    return Promise.reject({
      config,
      response: { status: 403, data: { detail } },
      isAxiosError: true,
    });
  }

  it('ends the session on a 403 whose detail says deactivated', async () => {
    installAdapter((config) => axios403(config, 'Organization is deactivated'));
    const logout = vi.fn();
    tokenStore.setLogoutHandler(logout);

    await expect(api.get('/companies/')).rejects.toBeDefined();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('does NOT end the session on an ordinary permission 403', async () => {
    installAdapter((config) => axios403(config, 'Insufficient permissions'));
    const logout = vi.fn();
    tokenStore.setLogoutHandler(logout);

    await expect(api.get('/companies/')).rejects.toBeDefined();
    expect(logout).not.toHaveBeenCalled();
  });

  it('drops impersonation (not the admin session) on a deactivated 403 while impersonating', async () => {
    impersonationStore.set({ token: 'imp-token', orgId: 'o1', orgName: 'O', userId: 'u1' });
    installAdapter((config) => axios403(config, 'Organization is deactivated'));
    const logout = vi.fn();
    tokenStore.setLogoutHandler(logout);

    await expect(api.get('/companies/')).rejects.toBeDefined();
    expect(impersonationStore.getToken()).toBeNull();
    expect(logout).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// The wire shape of calls whose server contract is not guessable.
//
// These four surfaces were each built against a shape the server never had, and
// each failed the same silent way: the page renders, the button clicks, the
// request 404s, and the error lands in a toast nobody reads as "this feature has
// never worked". Every one of them had passing tests — because the tests mock
// the api module, so they pinned the guess rather than the contract.
//
// So these assert the request that actually goes out. `tests/
// test_frontend_contract.py` on the backend pins that the route exists; this
// pins that we call it correctly.
// ---------------------------------------------------------------------------
describe('request shapes that are not guessable from the call site', () => {
  let seen;

  beforeEach(() => {
    seen = [];
    tokenStore.clear();
    impersonationStore.clear?.();
    installAdapter((config) => {
      seen.push(config);
      return axios200(config);
    });
  });

  it('GDPR export passes the subject as a query param, never a path segment', async () => {
    const { gdprApi } = await import('./client');
    await gdprApi.export('subject@example.com');

    expect(seen[0].url).toBe('/gdpr/export');
    expect(seen[0].params).toEqual({ email: 'subject@example.com' });
  });

  it('GDPR erase posts the address and the irreversibility acknowledgement', async () => {
    // Without `confirm` the server refuses with a 400 — so an erasure request,
    // the one operation with a legal deadline attached, silently did nothing.
    const { gdprApi } = await import('./client');
    await gdprApi.erase('subject@example.com');

    expect(seen[0].url).toBe('/gdpr/erase');
    expect(seen[0].method).toBe('post');
    expect(JSON.parse(seen[0].data)).toEqual({
      email: 'subject@example.com',
      confirm: true,
    });
  });

  it('investor updates use PUT — PATCH is not a method this API answers', async () => {
    const { investorsApi } = await import('./client');
    await investorsApi.update('inv-1', { firm: 'Acme Ventures' });
    await investorsApi.updateStatus('inv-1', 'passed');

    expect(seen.map((c) => [c.method, c.url])).toEqual([
      ['put', '/investors/inv-1'],
      ['put', '/investors/inv-1'],
    ]);
    // Partial update: a status move must not blank the rest of the record.
    expect(JSON.parse(seen[1].data)).toEqual({ status: 'passed' });
  });

  it('investor documents are addressed by their own id, not nested under the investor', async () => {
    const { investorsApi } = await import('./client');
    await investorsApi.getDocuments('inv-1');
    await investorsApi.createDocument('inv-1', { name: 'Deck' });
    await investorsApi.removeDocument('inv-1', 'doc-9');
    await investorsApi.removeInteraction('inv-1', 'int-9');

    expect(seen.map((c) => [c.method, c.url])).toEqual([
      ['get', '/investors/documents'],
      ['post', '/investors/documents'],
      ['delete', '/investors/documents/doc-9'],
      ['delete', '/investors/interactions/int-9'],
    ]);
    expect(seen[0].params).toEqual({ investor_id: 'inv-1' });
    // The investor travels in the body on create, since a document may be
    // investor-agnostic and the field is therefore optional server-side.
    expect(JSON.parse(seen[1].data)).toEqual({ name: 'Deck', investor_id: 'inv-1' });
  });

  it('approve-and-send targets the reply by path and carries the edited copy', async () => {
    const { smartReplyApi } = await import('./client');
    await smartReplyApi.send({ replyId: 'r-1', subject: 'Re: hello', body: 'edited' });

    expect(seen[0].url).toBe('/dialtone/inbox/r-1/approve-send');
    expect(JSON.parse(seen[0].data)).toEqual({ subject: 'Re: hello', body: 'edited' });
  });

  it('the AI outreach draft is /outreach, the route the server registers', async () => {
    const { investorsApi } = await import('./client');
    await investorsApi.generateEmail('inv-1', { log_interaction: true });

    expect(seen[0].url).toBe('/investors/inv-1/outreach');
  });
});
