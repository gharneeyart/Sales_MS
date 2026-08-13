import { Router } from "express"
import { QueryTypes } from "sequelize"

import { sequelize } from "../db/sequelize"
import { redis } from "../redis/client"
import { requireHelloToken } from "../middleware/auth"

export const helloRouter = Router()

// Proves the full frontend -> API -> DB (+ cache) path in one round trip:
// a real query against Postgres, and a real read/write against Redis.
helloRouter.get("/hello", requireHelloToken, async (_req, res, next) => {
  try {
    const [{ now }] = await sequelize.query<{ now: Date }>("SELECT NOW() as now", {
      type: QueryTypes.SELECT,
    })

    const hits = await redis.incr("hello:hits")

    res.json({
      message: "Hello from the API",
      dbTime: now,
      redisHits: hits,
    })
  } catch (error) {
    next(error)
  }
})
