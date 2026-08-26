import { Queue } from "bullmq"

import { queueConnection } from "./connection"

export interface ProcessWebhookJob {
  event: unknown
}

// The webhook route only verifies the Paystack signature and enqueues here —
// the worker (billing queue consumer) is the actual source of truth that
// updates Subscription state, so a slow/failing DB write never holds up the
// webhook response Paystack is waiting on, and failures get BullMQ's retries.
export const billingQueue = new Queue<ProcessWebhookJob>("billing", {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 200,
    removeOnFail: 500,
  },
})

export function enqueueBillingWebhookEvent(event: unknown) {
  return billingQueue.add("process-webhook", { event })
}
