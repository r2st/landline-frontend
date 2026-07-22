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
