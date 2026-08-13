# Architecture & Roadmap
## Multi-Tenant Sales & Inventory Management SaaS

> This is the working reference you keep in the repo. The full PRD (stack rationale, design process, security) lives in the companion document. This file is the two sections you'll look at most while building: **how the system is shaped** and **the order you build it in**.

Two words define every decision here: **isolation** (no business ever sees another's data) and **accountability** (we always know who did what).

---

## Part A — Architecture

### A.1 System topology (decoupled)

Unlike a single Next.js app, this is a **decoupled system**: a separate frontend and a separate backend that talk over HTTP, plus supporting services. This is a deliberate choice — it's what lets you run persistent BullMQ workers and pick your own backend framework.

```
        ┌─────────────────────┐
        │   Frontend (SPA)    │   React — the dashboard UI
        │   React + Vite      │   applies per-tenant branding
        └──────────┬──────────┘
                   │ HTTPS (JSON REST) + auth token
                   │ CORS-restricted
        ┌──────────▼──────────┐
        │   Backend API       │   Express OR AdonisJS
        │   Node + TypeScript │   all business logic + auth
        └───┬───────┬─────┬───┘
            │       │     │
   ┌────────▼──┐ ┌──▼───┐ │ enqueue jobs
   │ Postgres  │ │Redis │ │
   │ (data +   │ │(queue│ │
   │  RLS)     │ │+cache│ │
   └───────────┘ └──▲───┘ │
                    │      │
        ┌───────────┴──────▼──┐
        │  Worker process     │   BullMQ — runs background
        │  (BullMQ consumers) │   jobs & automations
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  Object storage     │   logos & files
        │  (S3-compatible)    │
        └─────────────────────┘
```

**The pieces:**
- **Frontend** — a React single-page app (Vite). Pure UI; holds no secrets; talks only to the backend API. Applies each tenant's brand theme at runtime.
- **Backend API** — Express or AdonisJS. **All** business logic, auth, validation, and database access live here. This is the only thing that touches the database.
- **Postgres** — the data, with Row-Level Security enforcing tenant isolation at the database level.
- **Redis** — BullMQ's job queue, plus a cache layer later if needed.
- **Worker process** — a second Node process running BullMQ consumers. Executes background jobs and automations. Shares the codebase with the API but runs separately.
- **Object storage** — an S3-compatible bucket (Supabase Storage, Cloudflare R2, or Cloudinary) for tenant logos and generated files.

> **Backend framework decision:** *Express + Sequelize* (you assemble the pieces, learn the most) **or** *AdonisJS + Lucid* (batteries included — ORM, auth, validation, migrations built in). Pick one; the architecture below is identical either way. Where Adonis gives you something for free, this doc notes it.

### A.2 The decoupling changes three things

Moving off a single Next.js app introduces boundaries that didn't exist before. Each is a place to be deliberate:

1. **Auth crosses a network boundary.** The frontend and backend are separate origins, so login can't rely on a same-app session. You issue a **token** the frontend sends on every request. See A.7.
2. **CORS.** The backend must explicitly allow requests from your frontend's origin and reject everything else. An allowlist, not a wildcard.
3. **Deployment is multi-service.** Frontend, API, worker, Postgres, Redis, and storage are separate deployables. The API and worker need a host that runs **persistent processes** (Railway, Render, Fly.io) — not a serverless platform.

### A.3 Tenancy model

**Shared database, shared schema, `organizationId` on every business table.** All businesses' rows live in the same tables, tagged by owning organization; every query filters by the current org. We rejected database-per-tenant (a fleet of DBs to manage) and schema-per-tenant (migrations become unmanageable) — shared-schema is correct for this scale and goes a long way.

The consequence: **isolation is a security property, not a feature.** A query missing its org filter leaks data across businesses — the cardinal SaaS bug. Defended in two independent layers: an app-level scoped query layer *and* database-level RLS (see the security document).

### A.4 Entities

Every business table carries `organizationId`, `createdAt`, `updatedAt`. Money is stored as **integer kobo** (₦1,500.50 → `150050`). IDs are UUIDs.

**Tenancy**
- **Organization** — a tenant (one business). `id`, `name`, `createdAt`.
- **User** — a login. `id`, `email` (unique), `passwordHash`, `name`.
- **Membership** — joins User↔Organization with a `role` (`OWNER` | `STAFF`). Enables staff invitations and multi-user businesses.

**Branding** *(new — see A.6)*
- **BrandSettings** — per-org theme. `id`, `organizationId`, `displayName`, `logoUrl`, `primaryColor`, `secondaryColor`, `accentColor`, `updatedAt`. One row per organization.

**Catalogue & stock**
- **Product** — `id`, `organizationId`, `name`, `category`, `sku`, `unitLabel` (bag/carton/piece), `costPrice`, `wholesalePrice`, `retailPrice`, `stockQty`, `reorderLevel`, `deletedAt`. Sold whole; items broken into smaller measures are modelled as separate products.
- **StockMovement** — the stock ledger. `id`, `organizationId`, `productId`, `change` (+/−), `reason` (`SALE`|`RESTOCK`|`ADJUSTMENT`|`RETURN`), `supplierId?`, `saleId?`, `performedByUserId`, `createdAt`. **Current stock = sum of movements.**
- **Supplier** — `id`, `organizationId`, `name`, `phone`, `notes`.

**Sales**
- **Sale** — `id`, `organizationId`, `customerId?`, `status` (`PENDING`|`PARTIALLY_PAID`|`PAID`|`CANCELLED`), `totalAmount`, `recordedByUserId`, `receiptNumber` (per-org sequential, e.g. RCT-000123), `latestReceiptUrl?`, `receiptGeneratedAt?`, `createdAt`.
- **SaleItem** — `id`, `saleId`, `productId`, `quantity`, `unitPriceAtSale`, `costAtSale`, `priceType` (`WHOLESALE`|`RETAIL`). Price **and** cost snapshotted at sale time.
- **Customer** — `id`, `organizationId`, `name`, `phone`, `notes`. Balance owed is *derived*, never stored.
- **Payment** — `id`, `organizationId`, `saleId`, `amount`, `method` (`CASH`|`TRANSFER`|`POS`|`OTHER`), `receivedByUserId`, `createdAt`. Multiple per sale → supports credit/partial payment.

**Billing**
- **Plan** — a tier: `id`, `name`, `priceKobo`, limits + feature flags. Seeded config first.
- **Subscription** — `id`, `organizationId`, `planId`, `status` (`TRIALING`|`ACTIVE`|`PAST_DUE`|`CANCELLED`), `currentPeriodEnd`, `providerCustomerRef`, `providerSubscriptionRef`. Every org has exactly one.

**Accountability**
- **ActivityLog** — append-only. `id`, `organizationId`, `actorUserId`, `action`, `entityType`, `entityId`, `metadata` (JSON snapshot), `createdAt`.

**Automation** *(new — see A.5)*
- **AutomationRule** — `id`, `organizationId`, `trigger` (`SCHEDULE`|`LOW_STOCK`|`DEBT_OVERDUE`|`SALE_RECORDED`|…), `config` (JSON: thresholds, schedule, channel), `action` (`SEND_NOTIFICATION`|`GENERATE_REPORT`|…), `enabled`, `createdAt`.
- **NotificationLog** — record of what automations sent, for accountability and to avoid duplicates. `id`, `organizationId`, `automationRuleId?`, `channel`, `payload`, `status`, `createdAt`.

### A.5 The automation layer

Automations are **trigger → condition → action**, executed asynchronously by BullMQ so they never slow down the user-facing request.

- **Triggers** are one of two kinds:
  - *Event-driven* — something happened in the app (a sale recorded, stock crossed its reorder level). The service function that did the work enqueues a job.
  - *Schedule-driven* — time-based (nightly sales summary, weekly debt reminders). BullMQ **repeatable jobs** (cron-like) fire these.
- **Conditions** filter whether the action should actually run (e.g. only remind customers who owe more than ₦X and haven't paid in 14 days).
- **Actions** do the thing — send a notification (email/SMS/WhatsApp), generate a report, flag a record.

**Start with a fixed set of built-in automations** the owner can toggle on/off and configure (thresholds, schedule, channel) via `AutomationRule`. Examples for v1:
- **Low-stock alert** — product drops below `reorderLevel` → notify owner.
- **Debt reminder** — customer owes past a threshold for N days → notify owner (or customer).
- **Daily sales summary** — scheduled → send yesterday's numbers to the owner.

A fully user-defined rules engine (arbitrary trigger/condition/action combinations) is a *later* evolution — the `AutomationRule` shape already anticipates it, but don't build the general engine until the fixed set proves the demand.

**Every automation action is org-scoped and logged** (NotificationLog) — automations are subject to the same isolation and accountability rules as human actions.

### A.6 Branding / per-tenant customization

Each organization can set its **display name, logo, and brand colours**, applied to the UI at runtime so their staff see *their* brand, not yours.

**How it works:**
1. Owner sets brand values in settings; uploads a logo. The logo goes to **object storage**; its URL is saved on `BrandSettings`.
2. On login/load, the frontend fetches the org's `BrandSettings` from the API.
3. The frontend applies colours as **CSS custom properties** (`--color-primary`, etc.) on the root element, and renders the logo and display name. Because the whole UI is built against those variables, the theme updates everywhere at once.

**Rules that keep this safe and sane:**
- **Colours are validated** as proper hex values server-side (a bad value could otherwise break the UI or inject styles).
- **Sensible defaults** — every org starts with your default theme, so nothing is ever unstyled.
- **Logo uploads are constrained**: allowed types **PNG/JPG/WebP only**, size-limited, and **SVG is disallowed by default** (SVG can carry embedded scripts — an XSS vector; see the security document). If SVG is ever needed, it must be sanitised and served with a restrictive content-type.
- Logos are served **from object storage / a CDN**, never proxied through the API.

### A.7 Auth flow (across the boundary)

Because frontend and backend are separate origins:

1. **Login** — frontend POSTs credentials to the API. API verifies, then issues a **short-lived access token** (JWT, ~15 min) and a **long-lived refresh token**.
2. **Token storage** — refresh token in an **httpOnly, Secure, SameSite cookie** (JS can't read it → protects against XSS token theft); access token held in memory by the frontend.
3. **Requests** — frontend sends the access token (Authorization header or cookie) on every API call. The API validates it, and derives **user + organization from it server-side** — never from the request body.
4. **Refresh** — when the access token expires, the frontend uses the refresh token to get a new one.
5. **Org context** — a user's active organization is resolved from their Membership and carried in the authenticated context, which the backend uses to set the Postgres RLS session variable per request.

> If you choose **AdonisJS**, its auth module provides much of this (token guards, sessions) out of the box. With **Express**, you assemble it (e.g. `jsonwebtoken` + your own refresh flow).

### A.8 Background jobs (BullMQ) — the job catalogue

The worker process runs these queues:
- **notifications** — send email/SMS/WhatsApp (invoices, receipts, alerts). Retried on failure.
- **automations** — evaluate and execute AutomationRules (both event- and schedule-triggered).
- **reports** — generate/refresh heavier reports and (later) rollup summaries.
- **billing** — process/retry payment webhooks and subscription state changes.

Why background jobs matter for "doesn't break": anything slow, external, or retry-prone (sending a message, calling a provider) must **not** happen inside the user's request. Enqueue it, return fast, let the worker handle it with retries. This keeps the API responsive under load.

### A.9 The request lifecycle (recording a sale, end to end)

1. **Frontend** sends the sale (products, quantities, price type) with the access token.
2. **API** validates the token → derives **user + organization** (never from the body).
3. **CORS** already ensured the request came from an allowed origin.
4. **Validation** (Zod / VineVine in Adonis) checks the payload shape.
5. **Authorization + entitlements** — is this user a member? within plan limits?
6. **Service function** opens a **transaction** and, inside it: sets the RLS org variable (`SET LOCAL`), creates Sale + SaleItems (snapshotting price & cost), writes StockMovements and updates cached stock, writes the ActivityLog entry, sets sale status.
7. **Transaction commits** — all or nothing.
8. **Enqueue** any follow-ups (e.g. a receipt notification job, a low-stock automation check) to BullMQ — *after* commit.
9. **Response** returns to the frontend.

Every mutating action follows this skeleton.

### A.10 Reliability & scale (so it accommodates growth and doesn't break)

- **Connection pooling** — a persistent Node backend holds a bounded Postgres pool; set sane pool limits so many concurrent requests don't exhaust the database.
- **RLS with pooled connections** — set the org context with `SET LOCAL` *inside the transaction* so it auto-resets when the transaction ends and never leaks to the next request sharing that connection. This is the critical correctness detail of RLS + pooling.
- **Indexes** — composite `(organizationId, createdAt)` on Sale, Payment, StockMovement; index foreign keys. Without these, reports do full-table scans that slow as data grows.
- **Bounded queries** — reports take a date range (default: current month); lists paginate; never load unbounded result sets.
- **Reports: compute-on-read first**, graduate to **rollup tables** (e.g. `DailySalesSummary`) only when volume demands — the design supports it as a drop-in cache.
- **Offload slow work to BullMQ** — the API stays responsive because heavy/external work runs in the worker.
- **Timezone** — store timestamps UTC; bucket reports in **WAT (UTC+1)** so "today" means today in Lagos.

### A.11 Receipts & invoicing

Every sale produces one branded document, generated in a BullMQ job so PDF rendering and delivery never block the sale.

- **One document, driven by payment state.** It always shows line items → Total → Amount Paid → Balance. Fully paid → balance ₦0, marked **PAID** (reads as a receipt); partial/credit → **Balance due: ₦X** (reads as an invoice). One template, not two.
- **Regenerated as payments arrive.** Because credit sales are paid over time, the document reflects *current* paid/balance. It is (re)generated on sale creation, on **each payment**, and on demand. The latest PDF URL is stored on the Sale (`latestReceiptUrl`) for re-download/re-send.
- **Branded & numbered.** Pulls the tenant's BrandSettings (logo, name, colours); carries a per-org sequential `receiptNumber` (e.g. RCT-000123) separate from the UUID.
- **Rendered with a PDF library — @react-pdf/renderer.** Pure JS (no headless Chromium in the worker), while still supporting the logo image, brand colours, fonts, and table layout a branded receipt needs. PDFKit is the lower-level fallback.
- **Three delivery paths off the one document:** view/print on screen (frontend, with print button); download PDF (from object storage); auto-send to customer via email and/or WhatsApp (through the notifications queue, recorded in NotificationLog — needs the customer's contact on file).
- **WhatsApp delivery constraint:** business-initiated WhatsApp messages use the WhatsApp Business API (via a provider — Meta/Twilio/360dialog) and require **pre-approved message templates**; plan for that when building WhatsApp delivery. Email has no such constraint.
- *(Optional later)* a per-payment payment-receipt, and a Receipt table for full version history, if the single latest-document-per-sale model proves insufficient.

---

## Part B — Roadmap

Each phase ends with something that works. Tenancy/auth is the foundation and comes first. Audit logging and entitlement checks are **cross-cutting** — woven into every phase, not phases of their own.

### Phase 0 — Plumbing & foundations
Two deployables scaffolded: **backend API** (Express or Adonis, TypeScript) and **frontend** (React + Vite). Postgres connected (pooled). Redis provisioned. ORM installed (Sequelize or Lucid). CORS configured (frontend origin allowlisted). A trivial authenticated "hello" round-trip proves the frontend→API→DB path. GitHub repo + GitHub Actions running type-check/lint on every push. Secrets in environment variables per environment.
**Outcome:** the full skeleton runs end to end, CI green, nothing business-specific yet.

### Phase 1 — Tenancy & auth (the foundation)
Organization, User, Membership. Full token auth flow (access + refresh, httpOnly cookie). Signup creates Org + Owner Membership + free Subscription in one transaction. **RLS switched on and proven** — a test confirming two orgs cannot see each other's rows, run in CI. Entitlements resolver stubbed ("free, allow all").
**Outcome:** people sign up, log in, and are provably isolated.

### Phase 2 — Branding & org settings
BrandSettings entity. Logo upload to object storage (PNG/JPG/WebP only, size-limited, SVG disallowed). Colour validation. Frontend applies the theme via CSS variables. Org settings screen (display name, colours, logo).
**Outcome:** each business sees its own brand — an early, motivating, visible win that also exercises file storage and per-tenant config.

### Phase 3 — Products & inventory
Product CRUD, categories, **search** (200+ products — required). StockMovement ledger + cached stock. Low-stock view. First real entitlement check (product limit). Audit logging wired in. Add Sentry.
**Outcome:** manage the full catalogue with an honest, explainable stock ledger.

### Phase 4 — Sales & payments
Record a sale (snapshot price + cost, draw down stock via ledger) via the full lifecycle. Customer records. Multiple Payments per sale, partial-payment/credit handling, sale status. **Receipts/invoices** (A.11): one branded document per sale showing Total/Paid/Balance, sequential `receiptNumber`, rendered with @react-pdf/renderer in a BullMQ job, regenerated on each payment; delivery via on-screen view/print and PDF download first. (Auto-send email/WhatsApp lands with the notifications queue in Phase 6.)
**Outcome:** the core money loop works end to end, with credit tracking and branded receipts.

### Phase 5 — Suppliers & goods received
Supplier records. Goods-received flow (StockMovement +qty RESTOCK + ActivityLog STOCK_RECEIVED).
**Outcome:** the full inbound side of inventory, with accountability.

### Phase 6 — Background jobs & automation
BullMQ + worker process live. Queues: notifications, automations, reports, billing. Built-in automations (low-stock alert, debt reminder, daily sales summary) with AutomationRule config + NotificationLog. Repeatable (scheduled) jobs. **Auto-send receipts** (email + WhatsApp) via the notifications queue lands here, on top of the receipt generation built in Phase 4.
**Outcome:** the app works *for* the owner without them watching it.

### Phase 7 — Reports & analytics
The report suite (sales over time, outstanding debts, best sellers, profit, inventory health, payment breakdown, sales by staff, top customers). Compute-on-read with indexes + bounded date ranges + WAT bucketing.
**Outcome:** the owner can see how the business is doing.

### Phase 8 — Subscription & billing
Real plans/limits, entitlements fully enforced, Paystack/Flutterwave integration, **webhook handler as source of truth** (processed via the billing queue), upgrade/downgrade, trials. Last, after real users reveal what's worth charging for.
**Outcome:** the app can take money and enforce plans.

### Ongoing / as-needed (non-blocking)
Rollup tables for reports (when volume demands) · rate limiting on auth endpoints · backup-restore verification · a user-defined automation rules engine · a customer-facing storefront (deferred at the very start; slots cleanly on top of this foundation).

---

## Appendix — Entities at a glance

**Tenancy:** Organization · User · Membership
**Branding:** BrandSettings
**Catalogue & stock:** Product · StockMovement · Supplier
**Sales:** Sale · SaleItem · Customer · Payment
**Billing:** Plan · Subscription
**Accountability:** ActivityLog
**Automation:** AutomationRule · NotificationLog

Invariants: every business table carries `organizationId`, `createdAt`, `updatedAt` · money is kobo integers · prices & costs snapshotted at sale time · current stock = sum of movements · every mutating action = session → validate → authorize → transaction (work + ledger + audit) → commit → enqueue, with RLS enforcing isolation underneath.
