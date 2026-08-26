# Sales & Inventory Management SaaS

Two independently deployable apps. See `architecture-and-roadmap.md` for the
full system design and phase-by-phase build order.

- `frontend/` — React + Vite + TypeScript, Tailwind v4, shadcn/ui.
- `backend/` — Express + TypeScript, Sequelize (Postgres), Redis.

## Status (through Phase 8)

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

**Sales & payments** — recording a sale snapshots price + cost per line,
locks the product rows (`FOR UPDATE`) to prevent oversell under concurrent
sales, draws down stock through the same ledger as Phase 3, and assigns a
per-org sequential receipt number via an atomic `UPDATE ... RETURNING` on
`organizations.receipt_counter`. Status (`PENDING`/`PARTIALLY_PAID`/`PAID`)
is recomputed from payments on every write, never drifts. Customer
`totalSpent`/`balanceOwed` are derived (never stored) via a raw aggregate
query, per A.4.

**Receipts** — a real BullMQ worker (`backend/src/worker.ts`, run
separately with `npm run worker`) renders a branded PDF with
`@react-pdf/renderer` and uploads it to Cloudinary, triggered after sale
creation and after every payment. `src/pdf/` is a scoped ESM boundary
(its own `package.json`) since `@react-pdf/renderer` is ESM-only and the
rest of the backend is CJS — `receiptService.ts` reaches it via dynamic
`import()`, the sanctioned interop path. The base-14 PDF fonts don't cover
the ₦ glyph, so `src/pdf/fonts/` embeds static Noto Sans weights
(OFL-licensed) instantiated from the variable font. The frontend has its
own HTML rendering of the same receipt for on-screen view/print
(`ReceiptView.tsx`, print-friendly, no app chrome) — the PDF is only for
download, per A.11's three delivery paths.

**Suppliers & goods received** — Supplier CRUD (name, phone, notes) and a
goods-received flow that reuses the New Sale screen's product-picker/line-row
pattern for familiarity: pick a supplier, add products with quantity + an
optional updated cost price, save. Writes a `RESTOCK` StockMovement per line
(same ledger as sales/adjustments) and one `STOCK_RECEIVED` ActivityLog entry
per delivery — the inbound side of inventory now has the same accountability
as the outbound side.

**Background jobs & automation** — the worker now runs three BullMQ queues
(`receipts` from Phase 4, plus `notifications` and `automations`; `reports`
and `billing` are reserved per A.8 but have no jobs yet — those land in
Phase 7/8). Three built-in automations, one `AutomationRule` row per
org+trigger: low-stock alert and debt reminder are evaluated by two global
repeatable jobs (daily at 08:00 WAT, sweeping every org); the daily sales
summary is genuinely per-org-scheduled — saving its send time registers a
BullMQ job scheduler keyed by org id via `upsertJobScheduler`, and disabling
it removes that scheduler. Every automation run is deduped so it fires at
most once per org per WAT day (`notificationDedup.ts`), and every attempt —
sent or failed — writes a `NotificationLog` row. Actual delivery is stubbed:
`notifications/sender.ts` is a swappable interface (same pattern as
`storage/cloudinaryStorage.ts`) currently backed by a console logger for
email, while WhatsApp honestly fails every time since no Business API
provider or approved templates are configured (A.11) — real email delivery
is a small swap away if you want to wire a provider.

**Reports & analytics** — compute-on-read, no pre-aggregation: `GET
/api/reports?from&to` runs six raw-SQL aggregate queries in parallel inside
one `withOrgTransaction` (sales over time, top products by revenue/units,
profit, outstanding debts, payment method breakdown, inventory health).
Date range defaults to WAT month-to-date, is capped at 366 days, and every
query is scoped to it except outstanding debts and inventory health, which
are point-in-time by nature. Sales-over-time zero-fills empty buckets via
`generate_series` LEFT JOINed against `sales` — otherwise a sparse range
(e.g. one sale in a 7-day window) would render as a single stray bar instead
of a proper time axis. Bucket granularity switches from day to week past a
45-day span. All timestamps bucket in WAT (`created_at AT TIME ZONE
'Africa/Lagos'`), consistent with the rest of the app (A.10); the frontend
re-derives the WAT calendar day for axis labels via
`Intl.DateTimeFormat(..., { timeZone: "Africa/Lagos" })` rather than trusting
the browser's local timezone. The payment-methods chart uses a fixed
categorical palette independent of tenant branding, validated with the
`dataviz` skill's contrast/CVD checker.

**Subscription & billing** — three real plans (Free ₦0/50 products/2 staff,
Starter ₦5,000/mo/300 products/5 staff, Pro ₦15,000/mo/unlimited
products/15 staff; a missing `maxProducts` key means unlimited, per
`entitlements.ts`). New orgs get a 14-day trial of Pro so they see the full
product before hitting any limit; a daily worker sweep
(`expireOverdueTrials`) drops anyone whose trial lapsed without payment back
to Free. Entitlements are enforced on both product creation (Phase 3) and
staff invites (`assertCanInviteStaff` — pending invites count toward the seat
so an owner can't invite past the limit and find out only once each is
accepted). **Paystack** handles payment: `POST /api/billing/checkout`
upgrades (pricier plan) by calling Paystack's `transaction/initialize` and
redirecting the browser to its hosted checkout; downgrades (same price or
lower, including to Free) apply immediately with no gateway round-trip since
no payment is involved. **The webhook is the source of truth, not the
checkout response** — `POST /api/billing/webhook` only verifies the
`x-paystack-signature` HMAC (computed over the raw request body, captured via
`express.json()`'s `verify` hook since re-serializing the parsed JSON would
break the signature) and enqueues the event to the `billing` BullMQ queue;
the worker actually updates `Subscription` state, so a slow DB write never
holds up the response Paystack is waiting on, and failures get BullMQ's
retries. No real Paystack key is configured locally (`PAYSTACK_SECRET_KEY` is
a placeholder in `.env.example`) — checkout correctly reaches Paystack's API
and fails with "Invalid key"; the full webhook → queue → subscription-update
pipeline was verified by self-signing a test payload with the placeholder
secret and confirming the worker processed it correctly.

**Team management** — invites are now real, persisted `Invite` rows (`status`
PENDING/ACCEPTED/REVOKED), not just a bare signed token — needed so pending
invites can be listed and revoked. The invite JWT still carries a 7-day
expiry as a backstop, but the DB row is the actual authority: `acceptInvite`
checks both. Role changes and removal guard against leaving an org without
any owner, and against removing yourself. Billing mutations (checkout,
downgrade) are owner-only at the route level, matching team management.

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
npm run worker       # separate process — receipts won't generate without it

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
