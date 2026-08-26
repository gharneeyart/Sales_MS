import { Queue } from "bullmq"

import { queueConnection } from "./connection"

export interface GenerateReceiptJob {
  organizationId: string
  saleId: string
}

export const receiptsQueue = new Queue<GenerateReceiptJob>("receipts", {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
})

export function enqueueReceiptGeneration(job: GenerateReceiptJob) {
  return receiptsQueue.add("generate", job)
}
