import { Queue } from "bullmq"

import { queueConnection } from "./connection"

export interface DailySalesSummaryJob {
  organizationId: string
}

export const automationsQueue = new Queue("automations", {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
})

/** Registered/removed whenever an org saves its daily-sales-summary config — see automationService.ts. */
export function dailySalesSummaryJobId(organizationId: string) {
  return `daily-sales-summary:${organizationId}`
}
