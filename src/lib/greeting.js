// Pure, framework-free helpers for the dashboard greeting.
// Kept dependency-free so they can be unit-tested with `node --test`.

/** Time-of-day greeting for a given 0–23 hour. */
export function pickTimeGreeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** First name for a friendly greeting, or '' when unknown. */
export function firstNameOf(user) {
  if (!user || !user.name) return '';
  return String(user.name).trim().split(/\s+/)[0] || '';
}

/**
 * Build the full greeting, e.g. "Good morning, Sam" — or just the time-based
 * greeting when the user's name is unknown (anonymous / API-key mode).
 */
export function buildGreeting(user, hour) {
  const time = pickTimeGreeting(hour);
  const first = firstNameOf(user);
  return first ? `${time}, ${first}` : time;
}
