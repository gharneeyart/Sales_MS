import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

import { env } from "./config/env"
import { authRouter } from "./routes/auth"
import { invitesRouter } from "./routes/invites"
import { brandingRouter } from "./routes/branding"

export const app = express()

app.use(cors({ origin: env.corsOrigins, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.use("/api/auth", authRouter)
app.use("/api/invites", invitesRouter)
app.use("/api/settings/branding", brandingRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: "Internal server error" })
})
