# Inbox UI/UX Improvements

Audit of the Landline **Inbox** (`src/pages/Inbox.jsx` and related components/hooks)
after several rounds of P0/P1 correctness fixes. The functionality is solid; this pass
is **purely UI/UX polish** — layout, readability, feedback, and speed-of-triage.

The reference surface is a single-column accordion: a stack of `ThreadCard`s that
expand in place to reveal messages + composer. It works, but has structural ceilings:
reading a thread pushes every other thread off-screen, there's no persistent reading
surface, unsent replies evaporate on collapse, and destructive actions have no undo.

## Scope & priorities

| # | Area | Verdict | Priority |
|---|------|---------|----------|
| 1 | Visual design (spacing/type/color) | Inconsistent blue/indigo accents, cramped density | **P1** |
| 2 | Two-pane reading layout | Missing — accordion only | **P0** |
| 3 | Email preview snippets | Present but thin (snippet only, no sender line) | **P1** |
| 4 | Thread visualization / conversation flow | Flat list, no sent/received differentiation | **P1** |
| 5 | Draft autosave | **Bug** — collapsing a thread drops unsent text | **P0** |
| 6 | Undo on archive/bulk | Missing — irreversible, toast has no action | **P0** |
| 7 | Keyboard shortcuts | None | **P1** |
| 8 | Unread count badge in nav | Only a binary red dot | **P0** |
| 9 | Empty states | Basic single empty state | **P1** |
| 10 | Loading / skeletons | Bare spinner | **P0** |
| 11 | Mobile responsiveness | Works but not designed for two-pane | **P1** |
| 12 | Rich text composer | Plain `<textarea>` | **P1** |
| 13 | Conversation Intelligence UX | Buried in an expanded thread, low discoverability | **P1** |
| 14 | Avatars / initials | Missing | **P0** |
| 15 | Relative timestamps | Present (`timeAgo`) but no absolute-on-hover | **P1** |
| 16 | Status indicators | Partial (sent/opened/replied); no bounced / needs-attention | **P1** |

---

## P0 — ship now

### P0-1 · Two-pane reading layout (#2, #4)
Replace the accordion with a **list + detail** split on `lg+`:
- **Left rail** (fixed ~380px, independently scrollable): compact thread rows —
  avatar, sender/lead, subject, one-line snippet, timestamp, status pill, unread dot,
  select checkbox.
- **Right pane** (flex): the open conversation, rendered as a **chat-style flow**
  (received messages left-aligned/neutral, sent messages right-aligned/tinted), an
  Intelligence strip in the header, and a docked composer.
- On mobile the rail and detail are mutually exclusive views with a back button.

Selecting a thread marks it read (preserving the current expand-to-mark-read behaviour)
and opens it in the detail pane — no more losing your place in the list.

### P0-2 · Draft autosave (#5)
Per-thread reply drafts persist to `localStorage` (`useInboxDrafts`), keyed by
`gmail_thread_id`. Switching threads, navigating away, or an accidental reload all keep
the draft. Sending clears it. Fails soft when storage is unavailable (private mode).

### P0-3 · Undo on archive & bulk actions (#6)
Archive (single + bulk) and bulk mark-read now surface a toast with an **Undo** button
that reverses the mutation (unarchive / mark-unread). Optimistic feedback with a real
escape hatch — the single most common "oops" in an inbox.

### P0-4 · Sender avatars (#14)
Deterministic initials avatar (`Avatar`) — stable colour derived from the sender's
email/name — on every thread row and every message bubble. Instantly scannable "who".

### P0-5 · Skeleton loading (#10)
Replace the centered spinner with a **skeleton** of the thread rows (and a detail-pane
skeleton), so the layout doesn't jump when data lands.

### P0-6 · Unread count badge in nav (#8)
Numeric badge on the **Inbox** sidebar item and the top-bar bell, driven by a
lightweight "needs reply" count (`useInboxUnread`, reuses the existing
`filter=needs_reply` endpoint). Replaces the binary red dot.

---

## P1 — this pass

- **P1-1 · Visual system (#1):** settle on the app's **indigo** accent (per CLAUDE.md)
  across the Inbox — buttons, active tabs, focus rings — instead of the current mix of
  `blue-500`/`indigo`. Tighten spacing to a consistent 4px rhythm.
- **P1-2 · Richer list rows (#3):** sender name + snippet + lead on every row, with the
  matching account shown when "All accounts" is selected.
- **P1-3 · Conversation flow (#4):** message bubbles differentiate direction, show
  per-message avatar + relative time (absolute on hover), and collapse cleanly.
- **P1-4 · Keyboard shortcuts (#7):** `j`/`k` move selection, `e` archive, `r` focus
  reply, `⌘/Ctrl+Enter` send, `/` focus search, `Esc` closes detail (mobile). A `?`
  affordance documents them. Disabled while typing (except send/esc).
- **P1-5 · Rich text composer (#12):** `contentEditable` WYSIWYG with **bold / italic /
  link** toolbar, emitting sanitized HTML + plain-text fallback. Templates, signatures
  and AI drafts insert into it.
- **P1-6 · Intelligence discoverability (#13):** promoted from a buried accordion to a
  one-click strip in the detail header, with momentum, objections, next action and
  "use suggestion".
- **P1-7 · Status indicators (#16):** thread-level status pill — **Needs attention**
  (unread inbound), **Replied**, **Bounced** — plus per-message status badges (adds
  `bounced`).
- **P1-8 · Timestamps (#15):** keep `timeAgo` labels, add `title` with the full
  absolute date/time on hover everywhere.
- **P1-9 · Empty & no-selection states (#9):** context-aware list empties (already
  present) plus a friendly **"Select a conversation"** placeholder in the detail pane.
- **P1-10 · Mobile (#11):** rail/detail become a navigable two-screen flow; composer and
  toolbars wrap; verified at 375px.

---

## P2 — backlog (documented, not in this pass)

- Real-time inbox updates (websocket / poll) instead of manual **Sync**.
- Snooze / remind-me on a thread.
- Collapse quoted reply history ("show trimmed content").
- Attachments (view/download inbound, attach outbound).
- Saved-search / smart folders; multi-select range with shift-click.
- Read-receipt timeline visualization (opened/clicked events on a mini-timeline).
- Bulk "move to" / label taxonomy beyond archive.

---

## Implementation notes

- **New components:** `Avatar`, `Skeleton` (+ `InboxSkeleton`), `RichTextComposer`.
- **New hooks:** `useInboxDrafts` (localStorage), `useInboxUnread` (badge count).
- **New util:** `src/lib/inboxUi.js` — `fullTimestamp`, `senderDisplay`, `threadStatus`.
- **Backend:** none required. Everything reuses shipped `/emails/*` endpoints; the badge
  reuses `filter=needs_reply`. Frontend-only change, deployed to Amplify.
- **Tests:** `Inbox.test.jsx` rewritten for the two-pane structure; new unit tests for
  `Avatar`, `RichTextComposer`, `inboxUi`, `useInboxDrafts`.
