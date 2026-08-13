import express from "express"
import cors from "cors"

import { env } from "./config/env"
import { helloRouter } from "./routes/hello"

export const app = express()

app.use(
  cors({
    origin: env.corsOrigins,
  })
)
app.use(express.json())

app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.use("/api", helloRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: "Internal server error" })
})
