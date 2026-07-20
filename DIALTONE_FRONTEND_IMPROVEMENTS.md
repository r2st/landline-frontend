# Dialtone Frontend — Audit & Prioritized Improvements

**Date:** 2026-07-16
**Scope:** Dialtone-related surfaces in `landline-frontend`, cross-referenced against `landline-backend` @ `8493ea1`.
**Status:** ✅ **DONE — and this document's own headline was wrong. Read the correction below before trusting anything here.**

---

## ⚠️ Correction (2026-07-16, after implementation)

**This audit was written against a stale checkout.** The `8493ea1` it cross-referenced was a *local* commit; `origin/main` was **24 commits ahead**. Two of its headline claims are false:

1. **`/api/v1/ai-drafts` exists** — `app/routers/ai_drafts.py`, registered in `main.py`, with `GET ""`, `POST /{id}/approve`, `POST /{id}/reject`. It is a complete human-review queue for AI-composed first touches. The claim "no router, no route, no branch, no commit" was an artifact of grepping a checkout that predated it. Only the *frontend* was missing; it now exists at `/dialtone/drafts`.
2. **P0-1 was already fixed** — commit `6ee9c92` extended `CandidateRead` with `raw_data`, `has_email`, `contact_email`, `contact_name`, `contact_title`, `contact_phone`, resolved from the linked `Contact` via a batch `_to_reads()`. The frontend already read those fields. No work was needed.

Also wrong in the detail: **P1-4** describes `/dialtone/discovery/queries`; `origin/main` uses `searches`, and has no `results/{id}/enrich` or `results/{id}/skip` (enrich is a flag on import).

The irony is not lost: **an audit about a frontend built against unverified backend contracts was itself written against an unverified backend checkout.** The lesson generalises — `tests/test_frontend_contract.py` in landline-backend now pins the routes the frontend calls, so this class of drift fails a test instead of an audit.

### What shipped

| Item | Outcome |
|---|---|
| P0-1 review queue fields | Already fixed on `origin/main` — no work |
| P0-2 AI reasoning unused | Done — expandable row w/ score breakdown |
| P0-3 Resume defeats safety gate | Done — routes via `/dialtone/resume`, handles 409 |
| P0-4 fabricated Settings badges | Done — new `GET /system/automation`; **two badges were actively wrong, not just unverified**, and the scheduling-link field wrote to localStorage that nothing read |
| P1-1 danger signals | Done — `/dialtone/health` |
| P1-2 replies inbox | Done — `/dialtone/inbox` |
| P1-3 domain health | Done — `/deliverability/domains` |
| P1-4 Places discovery | Done — `/dialtone/discovery` |
| AI drafts | Done — `/dialtone/drafts` (backend already existed) |
| P3-1 tile date bounds, P3-2 nav group | Done |
| P3-4 error≠empty | Done on all new Dialtone surfaces |

Not done: **P2** (dead wiring — ICP view, run candidates, manual run/re-learn triggers, reset-warmup) and **P3-3** (Dialtone provenance on company detail).

---

## Headline (as originally written — see correction above)

The audit did not find a frontend that needs polish. It found a frontend that has **fallen behind the backend by three whole features**, plus **three confirmed defects shipping right now** — including one where the newest merged commit renders nothing, and one where the UI silently defeats a safety gate the backend deliberately built.

Two premises in the original brief turned out to be wrong, and both are worth stating up front:

1. ~~**There is no `/api/v1/ai-drafts` endpoint.**~~ **FALSE — see correction.** No router, no route, no branch, no commit. `grep` across the entire backend for `draft` returns only unrelated hits (`tactics.py` LinkedIn drafts, `ai.py` improve-email, `investors.py` outreach drafts). So "does a frontend exist for it?" is moot — **the backend doesn't exist either.** The nearest real thing is `/dialtone/inbox/{reply_id}`, which lazily generates a `suggested_draft` for replies classified `interested`. That endpoint group has no frontend, and it is the feature the brief was probably reaching for (see **P1-4**).

2. ~~**The recently-shipped "contact details for Dialtone leads" feature cannot work.**~~ **ALREADY FIXED on `origin/main` — see correction.** It reads fields the API never returns. Details in **P0-1** — this is the single highest-value fix in the document.

**Suggested order:** P0 (fix what's broken and lying) → P1-1 (auto-pause visibility, safety) → P1-4 (replies inbox, revenue) → the rest.

---

## P0 — Confirmed defects, live now

### P0-1. The review queue's Industry, Location, and Email columns are permanently blank

**Severity: high — this is the most recent merged commit and it is inert.**

`Prospecting.jsx` reads `candidate.raw_data`, `candidate.has_email`, `candidate.contact_email`, `candidate.contact_name`, `candidate.contact_title`, `candidate.contact_phone`.

`CandidateRead` (`landline-backend/app/routers/prospecting.py:63`) declares **none of them**:

```python
class CandidateRead(BaseModel):
    id, run_id, company_id, company_name, domain, source,
    fit_score, qualification, reasoning, status,
    reviewed_by, reviewed_at, created_at
```

FastAPI's `response_model` **strips** undeclared fields. `raw_data` exists on the ORM model (`app/models/prospecting.py:130`) but is filtered out of the response. `has_email` / `contact_email` / `contact_name` / `contact_title` / `contact_phone` don't exist anywhere in the backend at all — `grep -rn "has_email\|contact_email" app/` returns zero hits in any prospecting file.

Rendered consequence, for **every row, always**:

| Column | Code | Actual output |
|---|---|---|
| Industry / query | `raw.industry` where `raw = candidate.raw_data \|\| {}` | `—` |
| Location | `locationOf(raw)` | `—` |
| Email | `candidate.has_email` → `undefined` → falsy | **"No email"** + `MailX` icon |

So the reviewer is asked to arm a real cold email to a real business while the UI tells them, incorrectly, that there is nobody to email — and shows no industry and no location to judge fit by. `Prospecting.jsx:114` carries the comment *"The address itself, not just 'Yes': approving enrols a real cold email, so the reviewer should see who it would go to."* That intent is correct and currently unrealized.

**Why it got through:** `Prospecting.test.jsx:39-58` mocks the *guessed* shape (`has_email: true`, `contact_email: 'shop@clevelandprecision.com'`, `raw_data: {...}`). The tests are green against a contract the server does not honor. This is a **recurrence of the June 2026 FE/BE contract divergence** — same mechanism, same failure signature (errors and gaps degrade to empty states rather than surfacing).

**Fix (backend-led, ~small):** extend `CandidateRead` with `raw_data`, plus computed `has_email` / `contact_email` / `contact_name` / `contact_title` / `contact_phone` resolved from the candidate's linked `Contact` (or from `raw_data`). Frontend needs no change — it's already written for the right shape. Then replace the hand-mocked test fixture with one derived from the real response.

### P0-2. Free win, same page: the AI's reasoning is already in the payload and thrown away

`CandidateRead` **does** return `reasoning: Optional[str]` (the AI's written rationale for the fit score) and `qualification: dict`. `grep -c "reasoning\|qualification" src/pages/Prospecting.jsx` → **0**.

A human is asked to approve or reject a cold email based on a bare 0-100 number, while the model's explanation of that number sits unused in the response body. Surface `reasoning` in an expandable row or detail drawer. Zero backend work.

### P0-3. The Resume button defeats the auto-pause safety gate

**Severity: high — this is a safety regression, not a missing feature.**

Backend Feature 2 (`6b8c455`) auto-pauses Dialtone when danger signals trip (bounce/complaint spikes). It flips the global kill switch off and records an unresolved trip. The intended way back is `POST /dialtone/resume`, which:

- requires `acknowledge_danger_signal_id` — you must acknowledge the specific trip,
- **re-checks live metrics** and returns **409 if the danger is still active** (unless `force`, which is logged),
- stamps every unresolved trip resolved.

`SendingKillSwitch.jsx:46` instead posts `/system/sending-toggle` with `reason: 'Resumed from dashboard'`. `system.py:70` performs **no trip check whatsoever** — it flips the switch unconditionally.

So the operator's only available Resume button resumes **straight back into an active incident**, with no re-check, and leaves the trip unresolved. Every guard the backend built is bypassed by the one control the UI exposes. `/dialtone/resume` has no frontend caller at all.

**Fix:** when an unresolved trip exists, the kill switch must route through `/dialtone/resume` with the acknowledgement, surface the breached metric and threshold, and handle the 409 by explaining that the danger is still live. Plain `/system/sending-toggle` should remain only for a clean manual pause/resume. Pairs naturally with **P1-1**.

### P0-4. Settings → Automation displays fabricated ON/OFF state

`Settings.jsx:202` initializes:

```js
const [automation, setAutomation] = useState({
  auto_reply: true, auto_followups: false, auto_scoring: false, scheduling_link: '',
});
```

`setAutomation` is called in exactly two places (`:265`, `:615`) — **both only for `scheduling_link`**. The three ON/OFF badges are hardcoded literals that are never fetched from anything.

The page then tells the user, at `:631`: *"These features are controlled by backend environment variables. Contact your administrator to change automation settings."* — i.e. it explicitly claims the badges reflect real backend state. They do not.

Reality check: `auto_reply_enabled` defaults `True` in `app/config.py:162`, so that badge is right **by coincidence**. There is no `auto_scoring` setting in backend config at all.

**Fix:** either expose the real flags via `/system` and fetch them, or delete the section. A status display that invents its values is worse than no status display — an operator will trust it during an incident.

---

## P1 — Backend shipped, frontend never built

Four endpoint groups are fully implemented, registered in `main.py`, and completely unreachable from the UI. Verified by grepping `src/` for each path (0 files each).

### P1-1. Danger signals / auto-pause dashboard — **build first**

`6b8c455`, Feature 2. Dark endpoints:

- `GET /dialtone/health/signals` — live metrics, thresholds, `overall_status`, `active_trip` (metric, scope, account, observed vs threshold, sample size, reason, triggered_at)
- `GET /dialtone/health/signals/events` — trip history
- `POST /dialtone/health/signals/test` — dry-run the thresholds
- `POST /dialtone/resume` — acknowledged resume

This is the feature that can **halt all outbound autonomously**, and there is no screen that says it happened, why, or what to do. Today the entire operator experience of an auto-pause is: sending silently stops, and the kill switch shows a reason string. Highest operational value on the board, and it closes P0-3.

### P1-2. Replies inbox — the actual "AI draft review queue"

`app/routers/replies.py`, prefix `/dialtone`. Dark endpoints:

- `GET /dialtone/inbox` — classified replies
- `GET /dialtone/inbox/stats`
- `GET /dialtone/inbox/{reply_id}` — full detail, **including a lazily-generated `suggested_draft` for `interested` replies** (`replies.py:201`)
- `POST /dialtone/inbox/{reply_id}/reclassify`
- `POST /dialtone/inbox/{reply_id}/read`

**Note:** `Inbox.jsx` is *not* this. It uses `useEmailHistory` → `/emails/inbox`, the generic mailbox. Dialtone's intent-classified reply queue — the thing that tells you which cold-email replies are hot leads and pre-drafts a response — is invisible.

This is the closest existing thing to the brief's "AI draft review queue", and it's where cold outreach turns into revenue. Highest business value after P1-1.

### P1-3. Domain Health Dashboard

`5efdf73`, Feature 5. Dark: `GET /deliverability/domains`, `GET /deliverability/domains/{domain}`, `POST /deliverability/domains/{domain}/recheck`.

`Reports.jsx:118` only calls the older one-off `/deliverability/domain-auth` single-domain check. The multi-domain monitoring dashboard has no UI. Directly relevant to the known open blocker: **apprend.tech has SPF+DKIM passing but no DMARC record.**

### P1-4. Google Places SMB discovery

`8493ea1`, P4. An entire CRUD feature is dark — `/dialtone/discovery/`: `queries` (GET/POST/PATCH/DELETE), `search`, `queries/{id}/run`, `results`, `results/{id}/enrich`, `results/{id}/import`, `results/{id}/skip`, `stats`.

`Discovery.jsx` is a different feature (`/discovery/*` — the Apollo path). Places-sourced SMB discovery — the newest lead source — can only be driven by curl. Note `SOURCE_LABELS` in `lib/constants.js:145` already has a `google_places: 'Google Places'` label, so the UI half-anticipates leads it gives you no way to generate.

---

## P2 — Dead wiring and missing triggers

| # | Finding | Evidence |
|---|---|---|
| P2-1 | `useProspectingIcp` hook + `prospectingApi.icp` defined, **rendered by no page**. The learned ICP is what every fit score is judged against, and it's invisible. | `useProspecting.js:56`, consumed nowhere |
| P2-2 | `prospectingApi.runCandidates` defined, **never called**. Run history shows "Found 40 / Qualified 12" with no way to see *which* companies. | `client.js:282` |
| P2-3 | No manual "Run prospecting now" — `POST /prospecting/run` has no caller. Prospecting is scheduled-only from the UI. | `prospecting.py:100` |
| P2-4 | No ICP re-learn trigger — `POST /prospecting/icp/learn` has no caller. | `prospecting.py:215` |
| P2-5 | `POST /system/reset-warmup` has no UI. | `system.py:92` |

---

## P3 — UX, IA, and consistency

### P3-1. Console stat tiles link to numbers that don't reconcile

`/dialtone/console` scopes `today` counts to `day_start..day_end` via `_reporting_today()` (`dialtone.py:549`). The tiles link to `/dialtone?type=email_sent` with **no date bound** (`DialtoneConsole.jsx:310-316`), and `/dialtone/activity` defaults to unbounded.

So the tile reads **"Sent: 12"** (today), you click it, and the feed shows **every sent event ever**. Fix: have tiles carry `start=<today>`.

### P3-2. Dialtone has no home in the nav

Its surfaces are scattered across three unrelated groups (`Layout.jsx:51-84`): "Dialtone Console" and "Daily Activity" under *Workspace*; "Prospecting" and "Discovery" under *Leads & Prospects*; "Inbox" and "Sequences" under *Outreach*. The flagship autonomous agent has no section of its own. With four new P1 pages landing, this needs a **Dialtone** nav group or they'll scatter too.

### P3-3. Company detail doesn't show Dialtone provenance

`CompanyDetail.jsx:232` shows `source` and nothing else. For an agent-discovered lead there's no fit score, no `reasoning`, no link to the prospecting run or candidate record that created it. You cannot answer "why is this company in my pipeline?" from its own page.

### P3-4. Every hook swallows errors into empty states

`useDialtone.js`, `useProspecting.js`, and others all wrap `catch { return [] }` / `return {}`. A 500, an auth failure, and a genuinely empty queue are pixel-identical: "Nothing waiting on you."

This is the **exact mechanism** of the June 2026 contract divergence — and it is why P0-1 has been shipping unnoticed. Worth a deliberate decision: distinguish *error* from *empty* at least on the Dialtone surfaces, so the next contract break announces itself instead of looking like a quiet afternoon.

---

## What is actually in good shape

Worth recording so it isn't "improved" needlessly:

- **Analytics** — open/reply rates, period-over-period deltas, `/email-sends/ab-stats` wired. Honest `clickRate: 0, // click data not available in trends` rather than a fake number.
- **Sequences** — per-step funnel with best/worst open-rate highlighting, conditional steps (`if_opened`).
- **Console activity feed** — URL-driven filters, correct inclusive-`end` date handling (`DialtoneConsole.jsx:251`), render-phase page reset, drill-down targets.
- **Approve confirmation** — `ConfirmDialog` on approve-but-not-reject is exactly the right asymmetry, and the copy is honest about arming a real send.

The care in these is real. The problem isn't craft — it's that the backend shipped four features past the frontend, and nobody re-checked the contract.

---

## Recommended sequence

| Phase | Work | Why |
|---|---|---|
| 1 | P0-1 + P0-2 (+ fixture fix) | Newest feature is inert; reviewers are deciding blind. Mostly backend. |
| 2 | P0-3 + P1-1 | Safety gate is bypassed; auto-pause is invisible. Same change. |
| 3 | P0-4 | Stop the UI inventing state. Small. |
| 4 | P1-2 replies inbox | Where cold outreach becomes revenue. |
| 5 | P1-3, P1-4 | Light up shipped features. |
| 6 | P2, P3 | Dead wiring, IA, error/empty split. |

---

## Open questions

1. **P0-1** — resolve contact fields from the linked `Contact` record, or from `raw_data`? Depends whether Places-sourced candidates get a `Contact` at discovery time or only at import.
2. **P1-4** — does Places discovery need full query CRUD in the UI, or is a read-only results view + import enough for now?
3. **P0-4** — expose real automation flags via `/system`, or delete the section?
4. **P3-4** — split error from empty across all Dialtone hooks, or only the review queue and console?
5. Is there an intended `ai-drafts` feature that was planned but never built? The brief referenced it as shipped. If it's on someone's roadmap, P1-2 is likely the same idea and shouldn't be built twice.
