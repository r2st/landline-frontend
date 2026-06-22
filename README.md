# Landline — B2B Lead Generation Dashboard

A React-based frontend for manufacturing B2B lead generation, targeting companies in the USA and Canada.

## Overview

Landline helps sales teams identify, score, and nurture manufacturing leads through an intuitive pipeline interface. It provides company research, contact management, automated outreach sequences, and lead scoring to streamline the B2B sales process for manufacturing companies.

## Tech Stack

- **React 18** — UI framework
- **React Router v6** — Client-side routing
- **TanStack React Query v5** — Server state management
- **Axios** — HTTP client
- **Tailwind CSS 3** — Utility-first CSS framework
- **Recharts** — Charting library
- **Lucide React** — Icon library
- **React Hot Toast** — Toast notifications
- **Vite 5** — Build tool and dev server

## Quick Start

```bash
npm install
npm run dev
```

The dev server starts on [http://localhost:3000](http://localhost:3000) and proxies API requests to `http://localhost:8000`.

## Features

- **Dashboard** — Key metrics, pipeline overview, top leads, recent activity
- **Pipeline** — Kanban-style board with 7 stages: New, Researched, Scored, Contacted, Engaged, Qualified, Opportunity
- **Companies** — Searchable/filterable table of all leads with sorting
- **Company Detail** — Full company profile with contacts, outreach history, and quick actions
- **Import** — CSV drag-and-drop import for bulk company ingestion
- **Outreach Sequences** — Multi-step email sequence management with open/reply tracking
- **Settings** — Workspace configuration for scoring, notifications, and API settings

## Project Structure

```
landline-frontend/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── README.md
└── src/
    ├── main.jsx              # App entry point
    ├── App.jsx               # Router and layout setup
    ├── index.css             # Tailwind imports
    ├── api/
    │   └── client.js         # Axios instance, QueryClient, API functions
    ├── components/
    │   └── Layout.jsx        # Sidebar navigation layout
    ├── hooks/                # Custom React hooks (future)
    ├── lib/
    │   ├── constants.js      # Stage definitions, colors, labels
    │   ├── utils.js          # Utility functions (scoring, formatting)
    │   └── mockData.js       # 25 companies, 44 contacts, sequences, events
    └── pages/
        ├── Dashboard.jsx     # Metrics and activity overview
        ├── Pipeline.jsx      # Kanban pipeline board
        ├── Companies.jsx     # Company list with filters
        ├── CompanyDetail.jsx # Individual company view
        ├── Import.jsx        # CSV import interface
        ├── Sequences.jsx     # Outreach sequence management
        └── Settings.jsx      # Workspace settings
```

## API Endpoints

The frontend expects a backend at `http://localhost:8000/api/v1` with the following endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/companies` | List companies (with query params) |
| GET | `/companies/:id` | Get company by ID |
| POST | `/companies` | Create company |
| PUT | `/companies/:id` | Update company |
| DELETE | `/companies/:id` | Delete company |
| POST | `/companies/import` | Import CSV (multipart/form-data) |
| POST | `/leads/:id/score` | Score a lead |
| GET | `/leads/pipeline` | Get pipeline data |
| POST | `/leads/:id/transition` | Transition lead stage |
| GET | `/dashboard/metrics` | Get dashboard metrics |
| GET | `/outreach/sequences` | List sequences |
| POST | `/outreach/sequences` | Create sequence |
| POST | `/outreach/enroll` | Enroll company in sequence |
| GET | `/outreach/events` | List outreach events |

## Mock Data

The project includes comprehensive mock data in `src/lib/mockData.js` for development and demos:

- **25 manufacturing companies** across USA and Canada
- **44 contacts** with realistic titles and contact info
- **3 outreach sequences** with multi-step email templates
- **26 outreach events** (sent, opened, replied, bounced)
- **18 recent activity items** spanning the last 7 days
- **Dashboard metrics** with conversion and response rates
