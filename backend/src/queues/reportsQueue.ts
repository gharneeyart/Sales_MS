import { Queue } from "bullmq"

import { queueConnection } from "./connection"

// A.8's job catalogue names this queue for Phase 7's report generation/
// rollups. No jobs are enqueued yet — this just reserves the queue.
export const reportsQueue = new Queue("reports", { connection: queueConnection })
