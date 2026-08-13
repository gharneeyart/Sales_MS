# Sales & Inventory Management SaaS

Two independently deployable apps. See `architecture-and-roadmap.md` for the
full system design and phase-by-phase build order.

- `frontend/` — React + Vite + TypeScript, Tailwind v4, shadcn/ui.
- `backend/` — Express + TypeScript, Sequelize (Postgres), Redis.

## Phase 0 status

The skeleton runs end to end: frontend → API → Postgres + Redis, behind a
trivial bearer-token check (`/api/hello`). Real auth (access + refresh
tokens) lands in Phase 1 and replaces it — see `DevRoundTrip.tsx` and
`middleware/auth.ts` for the stand-ins.

## Local setup

Requires Postgres and Redis running locally (or point the env vars at
hosted instances).

```bash
createdb sales_dashboard_dev

cp backend/.env.example backend/.env    # fill in DATABASE_URL, REDIS_URL,
                                         # CORS_ORIGINS, HELLO_API_TOKEN
cp frontend/.env.example frontend/.env  # VITE_API_URL + the same
                                         # HELLO_API_TOKEN as the backend

cd backend && npm install && npm run dev   # http://localhost:4000
cd frontend && npm install && npm run dev  # http://localhost:5173
```

## Per app

```bash
npm run dev        # local dev server
npm run typecheck  # frontend: `npx tsc -b`, backend: `npm run typecheck`
npm run lint       # oxlint
npm run build       # production build
```

CI (`.github/workflows/ci.yml`) runs type-check, lint, and build for both
apps on every push and pull request.
