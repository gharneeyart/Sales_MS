# Sales & Inventory Management SaaS

Two independently deployable apps. See `architecture-and-roadmap.md` for the
full system design and phase-by-phase build order.

- `frontend/` — React + Vite + TypeScript, Tailwind v4, shadcn/ui.
- `backend/` — Express + TypeScript, Sequelize (Postgres), Redis.

## Status (through Phase 3)

**Tenancy + auth** — Organization, User, Membership, Plan, Subscription.
Signup creates an org + owner membership + free subscription in one
transaction. Login issues a short-lived access token (kept in memory on the
frontend) and a long-lived refresh token (httpOnly cookie); the frontend
silently refreshes on load. Staff join via an invite link (`POST
/api/invites` — email delivery lands in Phase 6, share the link manually
until then).

**Row-Level Security** — `memberships`, `subscriptions`, `brand_settings`,
`products`, and `stock_movements` all carry Postgres RLS policies keyed off
a per-transaction session variable (`app.current_org_id`), so isolation is
enforced by the database, not just an app-level query filter. This only
means something if the app connects as a non-superuser role — see
`backend/.env.example` and `backend/migrations/20260101000006-enable-rls.js`.
`backend/test/rls.test.ts` proves it and runs in CI against a throwaway
Postgres service container.

**Branding** — per-org BrandSettings (name, logo, primary/accent colours),
logo upload to Cloudinary (PNG/JPG/WebP only, real magic-byte sniffing, 2MB
cap), colours validated as hex server-side and applied as CSS variables on
the frontend.

**Products & inventory** — Product CRUD, category filter/autocomplete,
search, low-stock filter, pagination. Stock is a ledger
(`stock_movements`) with a cached `stockQty` on Product; every
create/adjust writes a movement and an ActivityLog entry in the same
transaction. First real entitlement check: the Free plan's product limit is
enforced on create. Sentry is wired in (`backend/src/instrument.ts`) but
stays off unless `SENTRY_DSN` is set.

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
                                         # the three JWT_* secrets, and a
                                         # real CLOUDINARY_URL (logo upload
                                         # won't work without one)
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
