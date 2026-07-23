// Connected email accounts — the source list behind the inbox's "account"
// filter. A user can connect several sending identities of two kinds:
//
//   1. Gmail accounts (OAuth)  — gmailApi.accounts()
//   2. SMTP accounts (manual)  — smtpApi.accounts()
//
// Both endpoints return the same relevant shape ({ id, email, display_name,
// status, ... }), so we normalize them into one list the dropdown can render
// and de-duplicate by address. Keeping this pure (no React, no network) makes
// the merge rules easy to unit-test.

// Normalize one provider's account list into { id, email, provider, status,
// displayName }. Non-arrays and account rows without an email are dropped.
function normalize(list, provider) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((a) => a && a.email)
    .map((a) => ({
      id: a.id,
      email: a.email,
      provider,
      status: a.status || null,
      displayName: a.display_name || null,
    }));
}

// Merge Gmail + SMTP accounts into one address-sorted list, de-duplicated by
// lowercased email. When the same address exists as both a Gmail and an SMTP
// account, the first one wins (Gmail, since it's listed first) — the inbox
// filters by address, so either resolves to the same mail.
export function mergeAccounts({ gmail = [], smtp = [] } = {}) {
  const all = [...normalize(gmail, 'gmail'), ...normalize(smtp, 'smtp')];
  const seen = new Set();
  const deduped = [];
  for (const acct of all) {
    const key = acct.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(acct);
  }
  deduped.sort((a, b) => a.email.localeCompare(b.email));
  return deduped;
}

// The human label for a dropdown option — the address, tagged with its
// provider so two identities on the same domain are still distinguishable.
export function accountOptionLabel(account) {
  if (!account) return '';
  const tag = account.provider === 'smtp' ? ' (SMTP)' : '';
  return `${account.email}${tag}`;
}

// Learn the connected-account identities from a page of inbox threads. Every
// message the backend returns is tagged with the account it belongs to
// (``gmail_account_email`` / ``gmail_account_id``), so the mail itself is a
// reliable source for the account switcher — independent of the
// /gmail/accounts + /smtp/accounts endpoints, which can come back empty for
// some sessions (e.g. accounts not linked to the caller's user row) and would
// otherwise leave the user with mail from several addresses but no way to
// filter by them. Returns the same normalized shape as ``mergeAccounts``.
// Provider is left null (not "gmail") so we never mislabel an SMTP address as
// Gmail — the switcher filters by address either way.
export function accountsFromThreads(threads) {
  if (!Array.isArray(threads)) return [];
  const seen = new Set();
  const out = [];
  for (const thread of threads) {
    const messages = Array.isArray(thread?.messages) ? thread.messages : [];
    for (const msg of messages) {
      const email = msg && msg.gmail_account_email;
      if (!email) continue;
      const key = email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: msg.gmail_account_id ?? null,
        email,
        provider: null,
        status: null,
        displayName: null,
      });
    }
  }
  return out;
}

// Merge the endpoint-sourced accounts with any learned from the mail, keyed by
// lowercased address (endpoint entry wins — it carries provider/status), and
// return one address-sorted, de-duplicated list for the switcher.
export function combineAccounts(connected = [], discovered = []) {
  const byEmail = new Map();
  for (const a of discovered) {
    if (a && a.email) byEmail.set(a.email.toLowerCase(), a);
  }
  for (const a of connected) {
    if (a && a.email) byEmail.set(a.email.toLowerCase(), a);
  }
  return [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email));
}
