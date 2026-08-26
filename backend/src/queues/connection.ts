import IORedis from "ioredis"

import { env } from "../config/env"

// BullMQ requires its own connection with maxRetriesPerRequest: null
// (it manages retries itself) — can't share the app's regular redis client.
export const queueConnection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null })
