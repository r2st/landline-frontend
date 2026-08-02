import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Four days of trend data. Compare mode asks for a doubled range and splits it
// down the middle, so the first two days are the "previous period" and the last
// two are "current":
//
//            sent   opened   clicked
//   previous  100       20         5   → open 20.0%, click  5.0%
//   current   100       20        10   → open 20.0%, click 10.0%
//
// Chosen so the two badges disagree: open rate genuinely did not move, click
// rate doubled. A Click Rate badge reading "+0%" is therefore the bug, not a
// coincidence of the fixture.
const TRENDS = [
  { date: '2026-07-01', sent: 50, opened: 10, clicked: 2, replied: 5, bounced: 0 },
  { date: '2026-07-02', sent: 50, opened: 10, clicked: 3, replied: 5, bounced: 0 },
  { date: '2026-07-03', sent: 50, opened: 10, clicked: 5, replied: 5, bounced: 0 },
  { date: '2026-07-04', sent: 50, opened: 10, clicked: 5, replied: 5, bounced: 0 },
];

const METRICS = {
  emails_sent: 200,
  emails_sent_last_week: 100,
  emails_sent_prev_week: 100,
  open_rate: 20,
  reply_rate: 10,
  click_rate: 7.5,
  total_opens: 40,
  total_replies: 20,
  total_clicks: 15,
  pipeline: [],
  industry_breakdown: [],
};

vi.mock('../hooks/useAnalytics', () => ({
  useAnalyticsMetrics: () => ({ data: METRICS, isLoading: false }),
  useEmailTrendsAnalytics: () => ({ data: TRENDS, isLoading: false }),
  useTopEngagedLeads: () => ({ data: [], isLoading: false }),
  useRecentEmailActivity: () => ({ data: [], isLoading: false }),
  useAnalyticsEmailSends: () => ({ data: [], isLoading: false }),
  useContactGrowth: () => ({ data: [] }),
  useEmailPerformance: () => ({ data: [] }),
  usePipelineAnalytics: () => ({ data: null }),
}));

// ResponsiveContainer collapses to 0×0 in jsdom; stub it to a fixed box.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 400, height: 200 }}>{children}</div>,
  };
});

import Analytics from './Analytics';

/** The comparison badge text on the card titled `title`, or null if absent.
 *
 * Scoped to the metrics row: "Open Rate" and "Reply Rate" also label the
 * performance gauges further down the page, which carry no badge.
 */
function badgeFor(container, title) {
  const row = container.querySelector('.grid.grid-cols-1.gap-4');
  const card = within(row).getByText(title).closest('div.rounded-xl');
  const badge = within(card).queryByText(/vs previous period/);
  return badge ? badge.textContent.replace(/\s+/g, ' ').trim() : null;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Analytics />
    </MemoryRouter>
  );
}

describe('Analytics — period comparison badges', () => {
  it('reports the click rate change instead of a hardcoded zero', async () => {
    // `clickRate: 0` sat in the comparison block behind a comment saying click
    // data was not in the trend series. It is — `/dashboard/email-trends`
    // returns `clicked` per day. The comment described the endpoint's history,
    // not the endpoint, and the cost was not a missing badge: 0 renders as a
    // real reading, so the card claimed "no change" through every change.
    const user = userEvent.setup();
    const { container } = renderPage();

    // Off by default — no badges until the operator asks for a comparison.
    expect(badgeFor(container, 'Click Rate')).toBeNull();

    await user.click(screen.getByRole('button', { name: /compare/i }));

    expect(badgeFor(container, 'Click Rate')).toBe('+100% vs previous period');
  });

  it('leaves the rates that genuinely did not move reading zero', async () => {
    // The other half of the assertion: "+0%" has to stay available as an honest
    // answer, or the fix has only moved which card is lying.
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(screen.getByRole('button', { name: /compare/i }));

    expect(badgeFor(container, 'Open Rate')).toBe('+0% vs previous period');
    expect(badgeFor(container, 'Reply Rate')).toBe('+0% vs previous period');
  });
});
