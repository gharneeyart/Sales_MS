# Sales & Inventory Management SaaS

Two independently deployable apps. See `architecture-and-roadmap.md` for the
full system design and phase-by-phase build order.

- `frontend/` — React + Vite + TypeScript, Tailwind v4, shadcn/ui.
- `backend/` — Express + TypeScript, Sequelize (Postgres), Redis.

## Phase 1 status

Tenancy + auth is live: Organization, User, Membership, Plan, Subscription.
Signup creates an org + owner membership + free subscription in one
transaction. Login issues a short-lived access token (kept in memory on the
frontend) and a long-lived refresh token (httpOnly cookie); the frontend
silently refreshes on load so a page reload doesn't log you out. Staff join
via an emailed invite link (email delivery itself lands in Phase 6 — for now
`POST /api/invites` returns the link to share manually).

**Row-Level Security is switched on and proven**: `memberships` and
`subscriptions` carry Postgres RLS policies keyed off a `SET`
per-transaction session variable (`app.current_org_id`), so tenant isolation
is enforced by the database, not just an app-level query filter. This only
means something if the app connects as a non-superuser role — see
`backend/.env.example` and `backend/migrations/20260101000006-enable-rls.js`
for why. `backend/test/rls.test.ts` proves two orgs can't see each other's
rows, and runs in CI against a throwaway Postgres service container.

Entitlements resolver is stubbed ("free, allow all") until Phase 8.

## Local setup

Requires Postgres and Redis running locally (or point the env vars at
hosted instances). RLS needs the app to connect as a dedicated, non-superuser
Postgres role — a superuser (or a table's owner without `FORCE ROW LEVEL
SECURITY`) silently bypasses RLS, which would make the isolation guarantee
fake in dev even though it's real in prod.

```bash
createdb sales_dashboard_dev

# One-time: create the restricted role RLS actually applies to, and hand it
# ownership of the database so migrations run as it.
psql -d postgres -c "CREATE ROLE sales_dashboard_app LOGIN PASSWORD 'devpassword';"
psql -d postgres -c "ALTER DATABASE sales_dashboard_dev OWNER TO sales_dashboard_app;"
psql -d sales_dashboard_dev -c "ALTER SCHEMA public OWNER TO sales_dashboard_app;"

cp backend/.env.example backend/.env    # DATABASE_URL uses the role above;
                                         # fill in REDIS_URL, CORS_ORIGINS,
                                         # and the three JWT_* secrets
cp frontend/.env.example frontend/.env  # VITE_API_URL

cd backend
npm install
npm run db:migrate
npm run db:seed      # seeds the Free plan every signup attaches to
npm run dev          # http://localhost:4000

cd ../frontend
npm install
npm run dev           # http://localhost:5173
```

## Per app

```bash
npm run dev        # local dev server
npm run typecheck  # frontend: `npx tsc -b`, backend: `tsc -p tsconfig.test.json`
npm run lint       # oxlint
npm run build      # production build
npm test           # backend only — vitest, includes the RLS isolation test
```

CI (`.github/workflows/ci.yml`) runs type-check, lint, build, and (backend)
the RLS test suite against a real Postgres service container, for both apps
on every push and pull request.
