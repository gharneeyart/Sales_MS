import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import * as Sentry from "@sentry/node"

import { env } from "./config/env"
import { authRouter } from "./routes/auth"
import { invitesRouter } from "./routes/invites"
import { brandingRouter } from "./routes/branding"
import { productsRouter } from "./routes/products"
import { salesRouter } from "./routes/sales"
import { customersRouter } from "./routes/customers"
import { suppliersRouter } from "./routes/suppliers"
import { goodsReceivedRouter } from "./routes/goodsReceived"
import { automationsRouter } from "./routes/automations"
import { reportsRouter } from "./routes/reports"
import { teamRouter } from "./routes/team"
import { accountRouter } from "./routes/account"
import { activityLogsRouter } from "./routes/activityLogs"
import { billingRouter } from "./routes/billing"

export const app = express()

app.use(cors({ origin: env.corsOrigins, credentials: true }))
// The `verify` hook stashes the exact bytes Paystack sent before body-parser
// re-serializes them — the webhook signature is an HMAC over those raw
// bytes, so re-encoding the parsed JSON would break verification.
app.use(express.json({ verify: (req, _res, buf) => { (req as express.Request).rawBody = buf } }))
app.use(cookieParser())

app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.use("/api/auth", authRouter)
app.use("/api/invites", invitesRouter)
app.use("/api/settings/branding", brandingRouter)
app.use("/api/products", productsRouter)
app.use("/api/sales", salesRouter)
app.use("/api/customers", customersRouter)
app.use("/api/suppliers", suppliersRouter)
app.use("/api/goods-received", goodsReceivedRouter)
app.use("/api/settings/automations", automationsRouter)
app.use("/api/reports", reportsRouter)
app.use("/api/team", teamRouter)
app.use("/api/account", accountRouter)
app.use("/api/activity-logs", activityLogsRouter)
app.use("/api/billing", billingRouter)

Sentry.setupExpressErrorHandler(app)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: "Internal server error" })
})
