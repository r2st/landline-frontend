// In-app help content for Landline.
//
// This is the single source of truth for the Help Center, contextual HelpIcon
// slide-overs, and the command-palette entry. Each article carries markdown
// `body` (rendered by <Markdown/>), a `category`, search `keywords`, and an
// optional `route` linking the article back to the feature it documents.
//
// Adding an article: append to `helpArticles` with a unique `id`, point it at a
// `category` id below, and — if it documents a real page — set `route` so the
// article can deep-link users to the feature. Keep `id`s stable: HelpIcon
// components on feature pages reference them directly.

export const helpCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'Rocket',
    description: 'Set up your workspace and send your first campaign.',
  },
  {
    id: 'contacts',
    title: 'Contacts & Pipeline',
    icon: 'Users',
    description: 'Build your list, score fit, and move deals through the pipeline.',
  },
  {
    id: 'campaigns',
    title: 'Campaigns & Email',
    icon: 'Send',
    description: 'Sequences, mailboxes, and the unified inbox.',
  },
  {
    id: 'dialtone',
    title: 'Dialtone AI Agent',
    icon: 'Radio',
    description: 'The autonomous cold-email agent and everything it drives.',
  },
  {
    id: 'deliverability',
    title: 'Deliverability',
    icon: 'ShieldCheck',
    description: 'Warmup, authentication, bounces, and reputation.',
  },
  {
    id: 'advanced',
    title: 'Advanced',
    icon: 'Sparkles',
    description: 'Spintax, multichannel, calling, knowledge, GDPR, webhooks.',
  },
  {
    id: 'platform',
    title: 'Platform & Settings',
    icon: 'Settings',
    description: 'Organizations, roles, team, usage, and admin.',
  },
];

export const helpArticles = [
  // ─── Getting Started ──────────────────────────────────────────────────────
  {
    id: 'welcome',
    category: 'getting-started',
    title: 'Welcome to Landline',
    route: '/help',
    keywords: 'welcome overview intro start basics what is landline b2b lead generation',
    summary: 'What Landline is and how the pieces fit together.',
    body: `# Welcome to Landline

Landline is a B2B lead-generation and client-management platform. It combines a CRM, a multi-channel outreach engine, and **Dialtone** — an autonomous cold-email AI agent that sources prospects, writes and sends first touches, triages replies, and protects your sending reputation on its own.

## The big picture

1. **Build a list.** Import contacts, discover new companies, and let ICP scoring rank who's worth your time.
2. **Reach out.** Send sequences from Gmail or your own SMTP mailboxes, or hand the whole job to Dialtone.
3. **Manage the pipeline.** Deals flow through a kanban board; agents nudge stalled deals and flag at-risk clients.
4. **Stay deliverable.** Warmup plans, SPF/DKIM/DMARC checks, bounce handling, and per-sender health keep you out of spam.

## Where to go next

- New here? Work through the **Getting Started checklist** on your Dashboard.
- Curious what the platform can do? Browse the [Features page](/features).
- Want the agent to run outreach for you? Read **Dialtone Console**.

Every feature page has a **?** button in its header — click it for help specific to that screen.`,
  },
  {
    id: 'getting-started-checklist',
    category: 'getting-started',
    title: 'New-user checklist',
    route: '/',
    keywords: 'onboarding checklist setup first steps getting started new account configure',
    summary: 'The five steps that get a new workspace sending safely.',
    body: `# New-user checklist

Follow these steps in order — each one unblocks the next.

## 1. Connect a mailbox
Outreach needs somewhere to send from. Connect a **Gmail account** with OAuth, or add a **custom SMTP/IMAP mailbox**. You can connect several and let Landline rotate between them.

> Don't send real campaigns from a brand-new mailbox. Start a **warmup plan** first (step 4).

## 2. Import or discover contacts
Upload a CSV of companies and contacts, or use **Discovery** and **Places Discovery** to source new leads. Landline dedupes on import and scores each contact against your ICP.

## 3. Verify your sending domain
Run **SPF / DKIM / DMARC checks** on the domain you send from. All three must pass before you send at volume — this is the single biggest lever on inbox placement.

## 4. Start a warmup plan
Ramp sending volume gradually with a **warmup plan** and a per-account daily cap. Reputation is earned over weeks, not days.

## 5. Send your first sequence
Build a multi-step **sequence** with a clear first touch and one or two follow-ups — or enroll contacts into **Dialtone** and let the agent handle it. Watch the **Unified Inbox** for replies.

You're live. Keep an eye on **Sender Health** and **Deliverability Health** as volume grows.`,
  },
  {
    id: 'features-overview',
    category: 'getting-started',
    title: 'Everything Landline can do',
    route: '/features',
    keywords: 'features capabilities list overview everything modules what can it do',
    summary: 'A tour of every capability, grouped by area.',
    body: `# Everything Landline can do

Landline is broad. Here's the map, area by area — each links to a deeper article.

## Contacts & pipeline
Contact management with groups, merge, ICP scoring and phone enrichment; a deal pipeline with a kanban board, an activity timeline, and a progression agent that nudges stalled deals.

## Campaigns & email
Multi-step sequences with conditional steps, A/B testing and send-time optimization; Gmail OAuth (multi-account), custom SMTP/IMAP mailboxes, and a unified inbox spanning all of them plus Dialtone replies.

## Dialtone (the AI agent)
An autonomous prospecting agent: AI draft generation with tone and spam scoring, reply triage with suggested drafts, A/B testing with statistical significance, per-contact send-time optimization, per-sender health, and orchestration policies that keep it inside your guardrails.

## Deliverability
Warmup plans, SPF/DKIM/DMARC verification, bounce classification and auto-suppression, pre-send spam scoring, Google Postmaster reputation, and global suppression lists.

## Advanced
Spintax template variation, multichannel (email + LinkedIn + phone) steps, cold-calling, a knowledge base that feeds the AI, GDPR export/erasure, and webhooks.

## Platform
Multi-tenant organizations with roles and team management, usage and billing dashboards, and a platform-admin console.

See the full [Features page](/features) for the interactive version.`,
  },

  // ─── Contacts & Pipeline ──────────────────────────────────────────────────
  {
    id: 'contact-management',
    category: 'contacts',
    title: 'Contact management',
    route: '/contacts',
    keywords: 'contacts import groups merge dedup enrichment people list csv add contact',
    summary: 'Import, organize, merge, and enrich your contacts.',
    body: `# Contact management

Contacts are the people you reach out to. Companies group them; deals track the money.

## Importing
- **CSV import** (Import page): map columns, and Landline dedupes on email as it loads. Malformed rows are flagged rather than silently dropped.
- **Business card scan**: photograph a card and OCR pulls out the name, title, email, and phone.
- **Discovery**: source brand-new companies and contacts from external providers.

## Organizing
- **Groups** are saved segments you can enroll into sequences in one action.
- **ICP score** ranks each contact 0–100 against your Ideal Customer Profile so you work the best-fit leads first.

## Merging duplicates
When two records describe the same person, **merge** them: pick the surviving record, and interactions, emails, and deals from both are combined. Merging is safer than deleting — nothing is lost.

## Phone enrichment
Dialtone can enrich contacts with phone numbers it discovers during prospecting. Enriched numbers show up on the contact and feed the cold-calling queue.

## Best practices
- Import clean data — bad emails hurt deliverability more than missing rows.
- Keep groups tight; a focused segment converts far better than "everyone".
- Review ICP scores before a big send and skip the cold tail.`,
  },
  {
    id: 'icp-scoring',
    category: 'contacts',
    title: 'ICP scoring',
    route: '/dialtone/icp',
    keywords: 'icp ideal customer profile fit score weights industry size location exclusions pinned learned rubric',
    summary: 'How fit scores are computed, and pinned vs learned fields.',
    body: `# ICP scoring

Every contact and company is scored 0–100 against your **Ideal Customer Profile** — the rubric that decides who's worth reaching out to. Dialtone uses this score to prioritize (and to skip poor fits entirely).

## The 100 points
- **Industry weights** — up to 40 points. How much each segment counts toward fit.
- **Company size** — up to 30 points. The headcount band that scores full marks.
- **Location** — up to 20 points. Preferred countries and states.
- **Hard exclusions** — criteria that zero out a score no matter what else fits.

Scores map to labels: **Hot** (81+), **Warm** (61–80), **Cool** (31–60), **Cold** (under 31).

## Pinned vs learned
The profile **refits itself from won deals every Monday**. This is the key idea:
- A field you **pin** is locked to your value and survives the weekly relearn.
- A field you leave alone keeps **tracking what actually closes**.

So when you edit a field, the only question that matters is "will Monday undo this?" — pin it if you want it to stick.

## Best practices
- Pin hard exclusions (industries or regions you'll never sell to). Let softer weights learn.
- Re-check the profile after a quarter of closed deals — the learned weights are your real market telling you who buys.`,
  },
  {
    id: 'pipeline-crm',
    category: 'contacts',
    title: 'Pipeline & CRM',
    route: '/pipeline',
    keywords: 'pipeline crm deals kanban stages board drag drop progression activity timeline',
    summary: 'The kanban board, stages, and how deals progress.',
    body: `# Pipeline & CRM

The pipeline is a kanban board of every deal, organized by stage.

## The stages
\`New Lead → Researching → Outreach → Engaged → Negotiating → Client → Churned\`

Drag a card between columns to advance it, or open a deal to change its stage, value, and owner. Each stage is a column; the board shows totals per stage so you can spot where deals pile up.

## Activity timeline
Open any company or deal to see its **activity timeline** — a chronological record of emails, calls, meetings, notes, and stage changes. It's the single source of truth for "what's happened with this account?"

## Deal progression agent
The **Deal Progression Agent** watches for deals that have gone quiet. When a deal stalls past a staleness threshold it suggests a next-best action — a follow-up, a nudge, or an escalation to a manager. You approve or dismiss each suggestion; nothing advances a real deal without your say-so unless you configure it to.

## Best practices
- Keep stages honest — a deal in "Negotiating" with no reply in three weeks is really "Engaged" or at-risk.
- Use the timeline before every touch so you never repeat yourself.
- Let the progression agent surface stalls; triage its suggestions daily.`,
  },

  // ─── Campaigns & Email ────────────────────────────────────────────────────
  {
    id: 'sequences',
    category: 'campaigns',
    title: 'Sequences & campaigns',
    route: '/sequences',
    keywords: 'sequences campaigns multi-step conditional steps a/b test send-time optimization drip email cadence',
    summary: 'Build multi-step sequences with conditional steps and A/B tests.',
    body: `# Sequences & campaigns

A **sequence** is an automated, multi-step outreach cadence. A **campaign** is a sequence running against a set of contacts.

## Building a sequence
1. Add steps in order: a first touch, then follow-ups. Each step is an email (or a LinkedIn/phone task in multichannel).
2. Set a **delay** before each step ("wait 3 days").
3. Add **conditional steps** — branch on whether the prior email was opened, clicked, or replied to. Replies typically end the sequence so you don't email someone mid-conversation.

## A/B testing
Give a step two or more variants (different subject lines or bodies). Landline splits enrollees between them and tracks open/click/reply rates per variant, so you can **declare a winner** once the difference is statistically significant.

## Send-time optimization
Instead of blasting at a fixed hour, let Landline schedule each contact's email for **their** best-performing window. See the Send-Time Optimization article for how the experiment arms work.

## Best practices
- Keep sequences short — 3 to 5 steps. Persistence past that annoys more than it converts.
- Test one thing at a time (subject *or* body, not both) so the winner is interpretable.
- Always leave a clear opt-out; it protects your domain reputation.`,
  },
  {
    id: 'gmail-integration',
    category: 'campaigns',
    title: 'Gmail integration',
    route: '/settings',
    keywords: 'gmail oauth google connect account send receive thread multi-account mailbox',
    summary: 'Connect Gmail accounts with OAuth for sending and receiving.',
    body: `# Gmail integration

Connect one or more Google accounts so Landline can send and receive mail as you.

## Connecting
Authorize with **OAuth** (no password ever touches Landline). You can connect **multiple accounts** and let outreach rotate between them to spread volume and lower per-mailbox risk.

## What you get
- **Send** sequence steps and one-off emails from any connected address.
- **Receive** replies, threaded correctly against the original conversation.
- **Thread management** — replies land in the Unified Inbox alongside your SMTP and Dialtone mail.

## Best practices
- Warm up each newly connected Gmail before real sends.
- Don't exceed Google's daily limits — set a conservative per-account cap.
- Keep OAuth authorized; if a token expires, reconnect from Settings.`,
  },
  {
    id: 'smtp-mailboxes',
    category: 'campaigns',
    title: 'SMTP & IMAP mailboxes',
    route: '/settings',
    keywords: 'smtp imap custom mailbox account host port credentials send receive',
    summary: 'Add custom SMTP/IMAP accounts for sending and receiving.',
    body: `# SMTP & IMAP mailboxes

When you send from your own domain (not Gmail), add a **custom SMTP/IMAP mailbox**.

## Adding a mailbox
Provide the SMTP host/port for sending and the IMAP host/port for receiving, plus credentials. Landline verifies the connection before saving.

## Sending & receiving
- **SMTP** handles outbound — sequence steps and manual sends.
- **IMAP** polls for replies so they appear in the Unified Inbox and can be triaged by Dialtone.

## Best practices
- Use a dedicated sending domain or subdomain, not your primary corporate domain — so a reputation hit never touches your main email.
- Verify SPF, DKIM, and DMARC for the domain (see Deliverability).
- Test deliverability from the mailbox before enrolling contacts.`,
  },
  {
    id: 'unified-inbox',
    category: 'campaigns',
    title: 'Unified inbox',
    route: '/inbox',
    keywords: 'unified inbox combined replies gmail smtp all mailboxes merged reply queue filter search archive priority bulk date',
    summary: 'One reply queue across Gmail and SMTP.',
    body: `# Unified inbox

Replies scatter across mailboxes. The **Inbox** pulls them into one place — Gmail and custom SMTP — so nothing slips.

## What's here
- Every conversation across all connected accounts, newest first, grouped into threads.
- Tabs for **Received**, **Sent**, **Opened**, **Needs reply**, **Priority**, and **Archived**.
- **Filter and search** by account, text (subject/body), and date range — searched and paged on the server so nothing is silently capped.
- **Mark read/unread, archive, and bulk-select** to work the queue fast. Incoming replies carry their intent label (interested, out-of-office, unsubscribe, wrong person) so you can jump to the hot ones first.

## Working the queue
Open a thread to read it and reply inline, with templates, signatures, and an AI-drafted suggestion. Opening a thread clears its unread dot.

## Best practices
- Clear the Needs-reply tab daily — speed of reply is the strongest predictor of booking a meeting.
- Trust the intent triage for the obvious buckets, but skim "interested" yourself.`,
  },

  // ─── Dialtone ─────────────────────────────────────────────────────────────
  {
    id: 'dialtone-console',
    category: 'dialtone',
    title: 'Dialtone Console',
    route: '/dialtone',
    keywords: 'dialtone console autonomous agent cold email activity log live feed overview prospecting',
    summary: 'The command center for the autonomous cold-email agent.',
    body: `# Dialtone Console

Dialtone is an **autonomous cold-email agent**. It sources prospects, writes and sends first touches, triages the replies, runs experiments, and pauses itself if deliverability degrades — inside the guardrails you set.

The Console is its command center: a **live activity feed** of everything the agent is doing right now.

## What the feed shows
Sends, opens, clicks, replies, bounces, unsubscribes, errors, leads discovered, and phones enriched — each as a timestamped event you can filter by type.

## The kill switch
Every Console carries a **sending kill switch**. Flip it and Dialtone stops sending immediately, across all accounts. Use it the moment something looks wrong; nothing else needs to be true for it to work.

## How the pieces connect
- **AI Drafts** — first touches waiting for your approval (if you're in assisted mode).
- **Replies** — incoming mail, triaged by intent.
- **A/B Tests**, **Send Timing** — the experiments it runs to improve results.
- **Policies** — the guardrails that bound its behavior.
- **Health** and **Senders** — the reputation signals that can auto-pause it.

## Best practices
- Watch the feed for the first few days after enabling autonomy.
- Know where the kill switch is before you need it.
- If errors spike, check Deliverability Health before resuming.`,
  },
  {
    id: 'ai-drafts',
    category: 'dialtone',
    title: 'AI draft generation',
    route: '/dialtone/drafts',
    keywords: 'ai drafts generation tone personalization spam score approve reject compose first touch review queue',
    summary: 'How Dialtone writes first touches, and the approval gate.',
    body: `# AI draft generation

Dialtone composes each first touch itself — personalized from what it knows about the contact, the company, and your knowledge base.

## What shapes a draft
- **Tone** — set the voice (direct, warm, consultative) in Policies; drafts follow it.
- **Personalization** — the agent pulls in company details, recent signals, and ICP context so the email isn't a mail-merge.
- **Spam score** — every draft is scored for spammy language and structure *before* it can send. High-scoring drafts are held back.

## The approval gate
In **assisted** mode, drafts land in the review queue. You **approve** or **reject** each one; approved drafts send, rejected ones are discarded (and teach the agent). In **autonomous** mode, drafts that pass spam scoring send without review.

## Best practices
- Start in assisted mode and read the first 20–30 drafts. Reject anything off-tone; the agent adapts.
- Keep the knowledge base current — better context means better drafts.
- Watch spam scores; a rising trend usually means a template needs a rewrite.`,
  },
  {
    id: 'reply-triage',
    category: 'dialtone',
    title: 'Reply triage & smart reply',
    route: '/dialtone/inbox',
    keywords: 'reply triage smart reply classification intent interested out of office unsubscribe suggested draft approve send',
    summary: 'Automatic reply classification and one-click suggested responses.',
    body: `# Reply triage & smart reply

When a prospect replies, Dialtone reads it, **classifies the intent**, and drafts a suggested response — so you spend your time deciding, not typing.

## Classification
Each reply is tagged: **interested**, **not interested**, **out of office**, **unsubscribe / do not contact**, **wrong person**, or **question / objection**. You can reclassify if the agent gets one wrong, and it learns from the correction.

## Smart reply
For repliable intents, Dialtone drafts a suggested response in your tone. Review it, edit if needed, then **approve & send** — or write your own. Unsubscribes and bounces auto-suppress the contact so you never email them again.

## Best practices
- Work "interested" first — those are meetings waiting to be booked.
- Let auto-suppression handle unsubscribes; never override an opt-out.
- Correct misclassifications; a few corrections sharpen the model on your market's language.`,
  },
  {
    id: 'ab-testing',
    category: 'dialtone',
    title: 'A/B testing',
    route: '/dialtone/ab-tests',
    keywords: 'ab a/b test variant subject body open click reply rate winner declare statistical significance chi-squared confidence',
    summary: 'Compare variants and declare a winner with statistical rigor.',
    body: `# A/B testing

Dialtone runs experiments so its copy keeps improving. Each test splits enrollees between **variants** (different subject lines or bodies) and measures which performs.

## Reading a test
For each variant you see **open rate**, **click rate**, and **reply rate**, plus the sample size. The dashboard flags when a difference is **statistically significant** — meaning it's unlikely to be noise — using a chi-squared / confidence test on the results.

## Declaring a winner
Once a variant is significantly ahead, **declare the winner** and Dialtone shifts all future sends to it. Don't declare early: a variant that's "ahead" on 40 sends can easily flip on 400.

## Best practices
- Change one variable per test so the result tells you *why*.
- Wait for significance, not a hunch. The dashboard tells you when you're there.
- Retire losing variants; keep the winner as the new baseline and test against it.`,
  },
  {
    id: 'send-timing',
    category: 'dialtone',
    title: 'Send-time optimization',
    route: '/dialtone/send-timing',
    keywords: 'send time timing optimization optimal window per-contact experiment arm optimized control lift z-test confidence heatmap best hour day',
    summary: 'Per-contact optimal send windows, proven by experiment.',
    body: `# Send-time optimization

Not everyone reads email at the same time. Dialtone learns each contact's best window and schedules their sends for it.

## How it works
- **Per-contact windows** — the agent builds a profile of when a contact opens and replies, and targets that window.
- **Experiment arms** — a share of sends go to an **optimized** arm (scheduled by the model) and a **control** arm (sent normally). Comparing the two shows the real **lift**.
- **Significance** — a z-test on open/reply rates tells you whether the optimized arm is genuinely better or just lucky, with a confidence level.

## Reading the page
The heatmap shows best days and hours; the arm comparison shows optimized vs control lift. If the lift is significant and positive, the optimizer is earning its keep.

## Best practices
- Give it volume before judging — timing effects are small per-email and need sample size.
- Respect time zones; a "9am" send means 9am for the contact, not for you.
- If lift is flat after a fair sample, your audience may simply be time-insensitive — that's a valid result.`,
  },
  {
    id: 'sender-health',
    category: 'dialtone',
    title: 'Sender health',
    route: '/dialtone/senders',
    keywords: 'sender health reputation score bounce complaint rate throttle factor per-account mailbox trend degrading recovering domain monitoring',
    summary: 'Per-account reputation, trends, and automatic throttling.',
    body: `# Sender health

Every sending account has a **reputation**. Sender Health scores each one so a single bad mailbox can't drag down the rest.

## What's tracked
- **Reputation score** per account, with a **trend** (improving, stable, degrading, recovering).
- **Bounce rate** and **complaint rate** — the two numbers mailbox providers watch hardest.
- **Throttle factor** — when an account's numbers slip, Dialtone automatically slows its sends to let it recover instead of burning it out.

## Acting on it
- A **degrading** account should send less; the throttle does this automatically, but you can pause it manually.
- A **recovering** account is on the mend — don't rush volume back.
- Persistent high bounces usually mean a list-quality problem, not a mailbox problem.

## Best practices
- Check the trend arrows weekly, not the raw score.
- Rotate across several healthy mailboxes rather than pushing one hard.
- Pair this with **Domain Health** — sender and domain reputation are two halves of the same story.`,
  },
  {
    id: 'orchestration-policies',
    category: 'dialtone',
    title: 'Orchestration policies',
    route: '/dialtone/policies',
    keywords: 'orchestration policies guardrails enrollment mode manual assisted autonomous channel cadence max daily touches min hours human review adaptive delays',
    summary: 'The guardrails that bound what Dialtone may do on its own.',
    body: `# Orchestration policies

Policies are the guardrails around the agent — the rules it can't cross no matter what it decides.

## Enrollment modes
- **Manual** — the agent suggests; you do everything.
- **Assisted** — the agent drafts and queues; you approve before anything sends.
- **Autonomous** — the agent sends within the guardrails below, no approval needed.

## Channel & cadence guardrails
- **Allowed channels** — email only, or email + LinkedIn + phone.
- **Max daily touches** and **max total touches** per contact.
- **Minimum hours between touches**, so a contact never gets two messages back to back.
- **Adaptive delays** — the agent stretches or compresses timing based on engagement.

## Human-review triggers
Force a human into the loop when a reply mentions **pricing**, an **objection**, a **referral**, or anything **legal** — even in autonomous mode. These are the moments where a wrong automated reply costs a deal.

## Best practices
- Move to autonomous only after assisted mode has earned your trust.
- Set conservative daily caps first; raise them as reputation proves out.
- Always keep legal/pricing on human-review — cheap insurance.`,
  },

  // ─── Deliverability ───────────────────────────────────────────────────────
  {
    id: 'warmup',
    category: 'deliverability',
    title: 'Warmup plans',
    route: '/dialtone/senders',
    keywords: 'warmup plan gradual volume ramp daily cap reputation new mailbox slow start reset',
    summary: 'Ramp new mailboxes gradually so providers learn to trust them.',
    body: `# Warmup plans

A brand-new mailbox has no reputation. Send at volume on day one and providers treat you as spam. **Warmup** ramps you up slowly so trust builds first.

## How it works
- A warmup plan raises the **daily send cap** gradually over days and weeks.
- Each account has its own cap; Dialtone never exceeds it.
- You can **reset** a warmup if an account was paused or its reputation slipped, starting the ramp over.

## The ramp
Start low (a handful of sends a day), increase steadily, and only reach full volume once bounce and complaint rates stay clean throughout. Rushing the ramp is the most common self-inflicted deliverability wound.

## Best practices
- Warm every new mailbox and every new sending domain.
- Keep engagement high during warmup — send to your most responsive contacts first.
- If health degrades mid-ramp, pause and let it recover before continuing.`,
  },
  {
    id: 'domain-authentication',
    category: 'deliverability',
    title: 'SPF, DKIM & DMARC',
    route: '/deliverability/domains',
    keywords: 'spf dkim dmarc domain authentication dns verify check blacklist dnsbl spamhaus sending domain',
    summary: 'Verify the three DNS records that prove you are you.',
    body: `# SPF, DKIM & DMARC

These three DNS records prove to mailbox providers that your email really comes from your domain. Miss any one and you land in spam — or get rejected outright.

## The three checks
- **SPF** lists the servers allowed to send for your domain.
- **DKIM** cryptographically signs each message so it can't be forged in transit.
- **DMARC** tells providers what to do with mail that fails SPF or DKIM (and where to report it).

The **Domain Health** page verifies all three per sending domain and flags anything missing or misconfigured. It also checks blocklists (DNSBLs like Spamhaus) so you know if a domain is listed.

## Best practices
- Get all three passing **before** you send at volume — this is the single biggest deliverability lever.
- Start DMARC at \`p=none\` to monitor, then tighten to quarantine/reject once clean.
- Re-check after any DNS change; a typo silently breaks authentication.`,
  },
  {
    id: 'bounce-management',
    category: 'deliverability',
    title: 'Bounce management',
    route: '/dialtone/health',
    keywords: 'bounce management hard soft classification auto suppression bounce rate invalid mailbox full',
    summary: 'Hard vs soft bounces and automatic suppression.',
    body: `# Bounce management

A **bounce** is a send that couldn't be delivered. Bounce rate is one of the first numbers providers use to judge you, so Landline handles bounces automatically.

## Hard vs soft
- **Hard bounce** — permanent (the address doesn't exist). The contact is **auto-suppressed** immediately; sending again would only hurt your reputation.
- **Soft bounce** — temporary (mailbox full, server down). Landline retries a limited number of times before giving up.

## Auto-suppression
Hard-bounced addresses are added to your suppression list so no campaign can email them again. This is not optional — it's how you keep bounce rate low enough to stay in the inbox.

## Best practices
- Import clean lists; most hard bounces are a list-quality problem you can prevent.
- Watch bounce rate on the Deliverability Health page — a spike means auto-pause may trip.
- Never re-import addresses you already know bounced.`,
  },
  {
    id: 'spam-scoring',
    category: 'deliverability',
    title: 'Spam scoring',
    route: '/dialtone/drafts',
    keywords: 'spam score content analysis pre-send spammy language check deliverability filter words',
    summary: 'Pre-send content analysis that catches spammy copy.',
    body: `# Spam scoring

Before an email sends, Landline scores its **content** for the traits spam filters punish — trigger words, too many links, image-heavy bodies, misleading subjects, poor text-to-HTML ratio.

## When it runs
- **AI drafts** are scored before they can be approved or auto-sent; high scorers are held.
- You can score any template or message to see where it stands before enrolling contacts.

## Reading a score
A high spam score means the copy is likely to be filtered even with perfect authentication. The report points at the offending elements so you can fix them.

## Best practices
- Write like a person emailing one other person — plain text, one clear ask, minimal links.
- Avoid "free", "guarantee", ALL CAPS, and exclamation pileups in subjects.
- Fix the flagged elements rather than gaming the score; filters evolve.`,
  },
  {
    id: 'postmaster',
    category: 'deliverability',
    title: 'Google Postmaster Tools',
    route: '/deliverability/domains',
    keywords: 'google postmaster tools domain reputation delivery metrics spam rate feedback loop gmail',
    summary: 'Domain reputation and delivery metrics straight from Google.',
    body: `# Google Postmaster Tools

Google publishes reputation and delivery data for your sending domain through **Postmaster Tools**. Landline surfaces it so you see what Gmail sees.

## What it tells you
- **Domain and IP reputation** as Google rates it (high / medium / low / bad).
- **Spam rate** — the share of your mail Gmail users marked as spam.
- **Delivery errors** and authentication pass rates.

## Why it matters
Gmail is often the majority of a B2B list. Its verdict on your domain is close to ground truth — if Postmaster shows a falling reputation or a rising spam rate, act before your inbox placement collapses.

## Best practices
- Keep spam rate well under Google's threshold; a single bad campaign can spike it.
- Cross-check Postmaster against Sender Health — external and internal views should agree.
- React to a "low" reputation immediately: slow down, clean the list, lean on warmup.`,
  },
  {
    id: 'suppression',
    category: 'deliverability',
    title: 'Suppression lists',
    route: '/dialtone/suppression',
    keywords: 'suppression list global per-org dedup do not contact unsubscribe blocklist never email',
    summary: 'The do-not-contact list that keeps you compliant and clean.',
    body: `# Suppression lists

A **suppression list** is the set of addresses no campaign may ever email. It's how you honor opt-outs and stop re-emailing dead addresses.

## What lands here
- **Unsubscribes** and do-not-contact replies (added automatically by reply triage).
- **Hard bounces** (added automatically by bounce management).
- Addresses you add manually.

## Scope
Suppression applies at the **organization** level and can also be **global** across the platform. Entries are **deduped** so the same address isn't listed twice. Before any send, every recipient is checked against the list.

## Best practices
- Never remove someone who opted out — legally and reputationally it's not worth it.
- Import your existing suppression list when you onboard so old opt-outs carry over.
- Trust the automatic additions; they're doing compliance work for you.`,
  },

  // ─── Advanced ─────────────────────────────────────────────────────────────
  {
    id: 'spintax',
    category: 'advanced',
    title: 'Spintax',
    route: '/sequences',
    keywords: 'spintax template variation syntax deliverability spin curly braces randomize wording unique',
    summary: 'Template syntax that varies wording to protect deliverability.',
    body: `# Spintax

**Spintax** lets one template produce many slightly different messages. Identical mass emails are a spam signal; varied wording looks like real, individual outreach.

## The syntax
Wrap alternatives in braces, separated by pipes:

\`\`\`
{Hi|Hey|Hello} {name}, {I noticed|I saw|I came across} your work at {company}.
\`\`\`

Each send picks one option per group, so no two emails are byte-identical.

## Where to use it
Use spintax in sequence steps and Dialtone templates — especially in subject lines and opening sentences, where repetition is most visible to filters.

## Best practices
- Every alternative must read naturally; a clumsy spin is worse than none.
- Vary structure, not just synonyms — spin the sentence shape, not only single words.
- Keep the ask identical across variants; only vary the wrapping.`,
  },
  {
    id: 'multichannel',
    category: 'advanced',
    title: 'Multichannel outreach',
    route: '/sequences',
    keywords: 'multichannel email linkedin phone step types touch channels sequence cross-channel',
    summary: 'Mix email, LinkedIn, and phone steps in one sequence.',
    body: `# Multichannel outreach

Prospects respond to different channels. A **multichannel** sequence mixes step types so a contact might get an email, then a LinkedIn touch, then a call — all coordinated.

## Step types
- **Email** — automated sends, as in any sequence.
- **LinkedIn** — a task prompting you to connect or message.
- **Phone** — a task that drops the contact into the cold-calling queue with a briefing.

Non-email steps are **tasks** — Landline queues them for a human; it won't auto-connect on LinkedIn or auto-dial.

## Why it works
Coordinated channels reinforce each other: an email plus a well-timed call converts far better than either alone. Policies still bound the total touches so multichannel doesn't become harassment.

## Best practices
- Lead with email, escalate to call for engaged-but-silent contacts.
- Reference the prior touch on the next channel ("following up on my note").
- Respect the same cadence limits you'd use for email-only.`,
  },
  {
    id: 'cold-calling',
    category: 'advanced',
    title: 'Cold calling',
    route: '/calls',
    keywords: 'cold calling call system queue dial briefing script phone today integration',
    summary: 'The daily call queue, briefings, and scripts.',
    body: `# Cold calling

For contacts worth a voice, Landline runs a **call system** alongside email.

## The call queue
Today's calls are queued for you — sourced from phone steps in multichannel sequences, phone-enriched contacts, and manual adds. Work the queue top to bottom.

## Briefings
Each call comes with a **briefing**: who the contact is, their company, recent signals, prior touches, and a suggested talking script. You go in warm instead of cold-reading a name.

## Best practices
- Call engaged contacts (opened/clicked but didn't reply) — they already know you.
- Log the outcome right after; it feeds the timeline and the deal.
- Time calls to the contact's zone, same as send-time optimization for email.`,
  },
  {
    id: 'knowledge-base',
    category: 'advanced',
    title: 'Knowledge base',
    route: '/knowledge',
    keywords: 'knowledge base company product context ai guidelines strategy industries playbook config contacts',
    summary: 'The company and product context that grounds the AI.',
    body: `# Knowledge base

The knowledge base is what Dialtone **knows** — the company and product context it draws on to write relevant, credible outreach.

## What lives here
- **Contacts** — key people and reference accounts.
- **Guidelines** — how the AI should and shouldn't communicate.
- **Strategy** — your positioning and value propositions.
- **Industries** — segment-specific playbooks.
- **AI config** — the settings that steer generation.

## Why it matters
Draft quality is downstream of this content. A rich knowledge base produces emails that sound like they came from someone who understands the prospect's world; a thin one produces generic mail-merge.

## Best practices
- Fill in guidelines and strategy before turning the agent loose.
- Update industry playbooks as you learn what resonates per segment.
- Treat it as living documentation — the agent is only as sharp as its context.`,
  },
  {
    id: 'gdpr',
    category: 'advanced',
    title: 'GDPR controls',
    route: '/gdpr',
    keywords: 'gdpr data subject request export erasure erase delete right to access right to be forgotten privacy compliance dsar',
    summary: 'Fulfill data-subject export and erasure requests.',
    body: `# GDPR controls

When someone exercises their data rights, the **GDPR console** lets you fulfill the request by email address.

## Export (right of access)
Look up a contact by email to see everything Landline holds — the contact record, associated companies, and email history. Export it to hand the subject their data.

## Erasure (right to be forgotten)
Erase a contact's data permanently. Because this is irreversible, erasure is **gated behind a typed email confirmation** — you must retype the exact address to proceed. Nothing is deleted on a single click.

## Best practices
- Verify the requester's identity before exporting or erasing — the console acts on whatever email you give it.
- Export before you erase if you need a record that the request was fulfilled.
- Log requests outside Landline too; erasure removes the very data that proves who asked.`,
  },
  {
    id: 'webhooks',
    category: 'advanced',
    title: 'Webhooks',
    route: '/settings',
    keywords: 'webhooks integration endpoints events http post notify external crm zapier callback',
    summary: 'Push Landline events to your own systems.',
    body: `# Webhooks

Webhooks let Landline notify your own systems when things happen — a reply arrives, a deal advances, a contact unsubscribes.

## How they work
Register an endpoint URL and choose which events to subscribe to. When an event fires, Landline sends an HTTP POST with the event payload to your endpoint. Your system reacts — sync to another CRM, trigger a Slack alert, kick off a workflow.

## Best practices
- Return a 2xx quickly and process asynchronously; slow endpoints get retried.
- Verify the payload signature so you only act on genuine Landline events.
- Subscribe only to the events you use — fewer moving parts, less noise.`,
  },

  // ─── Platform & Settings ──────────────────────────────────────────────────
  {
    id: 'organizations',
    category: 'platform',
    title: 'Organizations & roles',
    route: '/settings/organization',
    keywords: 'multi-tenant organization org isolation roles team management members permissions admin manager agent',
    summary: 'How org isolation, roles, and team management work.',
    body: `# Organizations & roles

Landline is **multi-tenant**: each organization's data is fully isolated from every other. Users, contacts, campaigns, and settings live inside one org.

## Roles
- **Agent** — does the day-to-day outreach.
- **Manager** — plus team-level visibility and deal oversight.
- **Org admin** — plus member management, settings, and billing.
- **Platform admin** — cross-org "god view" (see Platform Admin).

## Team management
Org admins invite members, assign roles, and remove access from the Team page. Roles gate what each person can see and do, so an agent can't change billing and a manager can't delete the org.

## Best practices
- Grant the least role that lets someone do their job.
- Review membership when people change teams or leave.
- Keep at least two org admins so you're never locked out.`,
  },
  {
    id: 'platform-admin',
    category: 'platform',
    title: 'Platform admin',
    route: '/platform',
    keywords: 'platform admin organizations crud stats impersonation cross-org god view saas manage tenants',
    summary: 'Cross-organization management for platform administrators.',
    body: `# Platform admin

Platform admins manage the whole SaaS across every organization — a view no ordinary org role can see.

## What it does
- **Organization CRUD** — create, edit, and deactivate orgs.
- **Stats** — usage and health across all tenants.
- **Impersonation** — "view as" an organization to support or debug it. A banner makes it unmistakable when you're impersonating, so you never mistake one org's data for another's.

## Best practices
- Impersonate only to support a customer, and exit as soon as you're done.
- Treat cross-org stats as sensitive — it's every customer's data at once.
- Restrict the platform-admin role tightly; it bypasses tenant isolation.`,
  },
  {
    id: 'settings-billing',
    category: 'platform',
    title: 'Settings, usage & billing',
    route: '/settings',
    keywords: 'settings account team usage billing plan quota limits signature branding config dashboard',
    summary: 'Account settings, usage tracking, and billing.',
    body: `# Settings, usage & billing

Everything about how your workspace is configured lives under Settings.

## Account & workspace
Profile, email signature, connected mailboxes, and organization branding. This is where you connect Gmail/SMTP and tune workspace defaults.

## Usage
The **Usage dashboard** tracks contacts stored, emails sent, and AI calls against your plan's limits, with trends over time. Watch it so you're never surprised by a quota.

## Billing
Your plan and its limits. Usage rolls up here; upgrading raises your contact, send, and AI caps.

## Best practices
- Set an email signature before sending — a missing one reads as spam.
- Check usage mid-cycle, not at the end, so a busy month doesn't cut you off.
- Keep org branding filled in if you white-label to clients.`,
  },
];

// ── Derived helpers ─────────────────────────────────────────────────────────

/** Look up a single article by its stable id. */
export function getArticle(id) {
  return helpArticles.find((a) => a.id === id) || null;
}

/** All articles belonging to a category, in declaration order. */
export function articlesInCategory(categoryId) {
  return helpArticles.filter((a) => a.category === categoryId);
}

/** Category metadata by id. */
export function getCategory(id) {
  return helpCategories.find((c) => c.id === id) || null;
}

/**
 * Rank articles against a free-text query. Title hits rank above summary hits,
 * which rank above keyword/body hits. Returns the full list (best first) when
 * the query is empty so callers can show everything.
 */
export function searchArticles(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return helpArticles;
  const terms = q.split(/\s+/).filter(Boolean);

  return helpArticles
    .map((a) => {
      const title = a.title.toLowerCase();
      const summary = (a.summary || '').toLowerCase();
      const keywords = (a.keywords || '').toLowerCase();
      const body = a.body.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (title.includes(term)) score += 10;
        else if (summary.includes(term)) score += 5;
        else if (keywords.includes(term)) score += 3;
        else if (body.includes(term)) score += 1;
        else return null; // every term must match somewhere
      }
      return { a, score };
    })
    .filter(Boolean)
    .sort((x, y) => y.score - x.score)
    .map((x) => x.a);
}
