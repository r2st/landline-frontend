# Landline (frontend) — PROJECT_INFO

**React dashboard for the Landline B2B manufacturing lead-gen pipeline — company research, contact management, lead scoring and outreach sequences.**

- **Repo:** https://github.com/Apprend-Technologies/landline-frontend · branch `main`
- **Local path:** `apprend_tech/landline-frontend`
- **Backend:** [`../landline-backend`](../landline-backend)

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 18 + React Router v6 |
| Build | Vite 5 |
| Server state | TanStack React Query v5 |
| HTTP | Axios |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Icons / toasts | Lucide React · React Hot Toast |
| Tests | Vitest (unit) · Playwright (e2e, `e2e/`) |

## Deploy location

| | |
|---|---|
| Platform | **AWS Amplify** — build spec in [`amplify.yml`](amplify.yml) |
| Build | `npm ci` → `npm run build` → publish `dist/` |
| Public URL | https://landline.apprendtechnologies.com |
| API it talks to | https://landline-api.apprendtechnologies.com |
| Trigger | Push to `main` |
| Security headers | Set in `amplify.yml`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection` |

No server, no port, no containers — it is a static SPA on Amplify's CDN.
`deploy/amplify-deploy.command` and `deploy/push-to-github.command` are convenience launchers.

## SSH key

**None.** Amplify deploys from GitHub; there is no host to log into.

⚠️ This repo's `origin` remote has a **GitHub PAT embedded in the URL** in `.git/config`,
visible to anything that runs `git remote -v`. Rotate it and switch to a credential helper
(`gh auth login` / macOS Keychain). See `~/projects/keys/KEYS_INDEX.md` §5.

## Environment variables

| Where | What |
|---|---|
| `.env` / `.env.production` (gitignored) | `VITE_API_URL`, `VITE_API_KEY`, `VITE_APP_NAME` |
| Amplify console | The production values — set per-branch in the Amplify environment-variables panel, **not** in this repo |

Vite inlines `VITE_*` at build time, so these end up in the shipped bundle:
`VITE_API_KEY` is public to anyone who loads the app. Treat it as an identifier, not a secret.

This repo has no `keys/` directory.

## Key commands

```bash
npm install
npm run dev                # Vite dev server
npm run build              # → dist/
npm run preview

npm test                   # vitest run
npm run test:coverage
npm run test:e2e           # playwright
npm run test:e2e:ui

npm run lint && npm run format:check
```

## Related projects

- [`../landline-backend`](../landline-backend) — the FastAPI API on EC2 `100.30.136.86`
- [`../apprend-frontend`](../apprend-frontend) — the other Amplify-hosted Apprend SPA
- `../lf-wt`, `~/projects/landline-frontend` — **duplicate checkouts of this same repo**; `apprend_tech/landline-frontend` is the canonical one (it sits next to the backend)
- `~/projects/PROJECT-INDEX.md`, `~/projects/keys/KEYS_INDEX.md` — estate-wide index
