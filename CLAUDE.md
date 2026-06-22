# CLAUDE.md

This file tells any Claude Code session everything it needs to know to work in this repo.

## Project Overview
Landline is a B2B lead generation and client management platform. React frontend with Vite, React Router, Tailwind-style CSS.

## Tech Stack
- React 18, Vite, React Router v6
- CSS with Tailwind-style utility classes
- recharts for data visualization
- Deployed to AWS Amplify (manual deploy, NOT git-connected)

## Code Structure
- `src/pages/` — Page components (Companies, Contacts, Sequences, Outreach, CardScanner, Demos, Settings, Clients, ClientDashboard, Tasks, Reports, Dashboard)
- `src/components/` — Reusable components (CommandPalette, TopBar, Sidebar, CompanyDetail tabs, modals)
- `src/hooks/` — Custom hooks (useCompanies, useContacts, useDeals, useTasks, useHealth, useInteractions, useReports, useClients)
- `src/api/client.js` — API client with axios
- `src/lib/` — Utilities and constants
- `src/App.jsx` — Router setup

## Common Tasks

### Dev server
```bash
npm run dev
```

### Production build
```bash
npm run build
```

### Add a new page
1. Create `src/pages/NewPage.jsx`
2. Add route in `src/App.jsx`
3. Add nav item in Sidebar component
4. Add to CommandPalette search

## Deploy
Push to main. Frontend is deployed to Amplify app `d1wnx5ebf5zf0f` via manual zip upload (not git-connected).
Build → zip `dist/` → create-deployment → upload → start-deployment.

## Conventions
- Push directly to main, no PRs
- All API calls use try/catch with graceful empty states
- API endpoints are relative `/api/v1/*` (proxied by Amplify)
- New pages need: route, sidebar nav entry, command palette entry
- Use existing component patterns (see `Companies.jsx` for table pattern, `CompanyDetail` for tabs)
- Mobile responsive (test at 375px)
- Accent color: indigo-based palette

## Key Patterns
- Pipeline stages shown as kanban: New Lead → Researching → Outreach → Engaged → Negotiating → Client → Churned
- Health badges: green (healthy), yellow (at_risk), red (churned)
- Priority colors: urgent=red, high=orange, medium=yellow, low=gray
- Command palette: ⌘K, searches companies, contacts, tasks, deals, and quick actions
