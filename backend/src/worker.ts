import "./instrument"
import { Worker } from "bullmq"

import { sequelize } from "./db/sequelize"
import { queueConnection } from "./queues/connection"
import type { GenerateReceiptJob } from "./queues/receiptsQueue"
import { generateReceipt } from "./services/receiptService"
import type { SendNotificationJob } from "./queues/notificationsQueue"
import { processNotificationJob } from "./services/notificationService"
import { automationsQueue, type DailySalesSummaryJob } from "./queues/automationsQueue"
import {
  evaluateDebtOverdueForAllOrgs,
  evaluateLowStockForAllOrgs,
  sendDailySalesSummary,
} from "./services/automationEvaluators"
import { billingQueue, type ProcessWebhookJob } from "./queues/billingQueue"
import {
  processBillingWebhookEvent,
  expireOverdueTrials,
  type PaystackChargeSuccessEvent,
} from "./services/billingService"

async function main() {
  await sequelize.authenticate()
  console.log("Postgres connected (worker)")

  const receiptsWorker = new Worker<GenerateReceiptJob>(
    "receipts",
    (job) => generateReceipt(job.data.organizationId, job.data.saleId),
    { connection: queueConnection }
  )
  receiptsWorker.on("completed", (job) => console.log(`Receipt generated for sale ${job.data.saleId}`))
  receiptsWorker.on("failed", (job, err) => console.error(`Receipt generation failed for sale ${job?.data.saleId}`, err))

  const notificationsWorker = new Worker<SendNotificationJob>(
    "notifications",
    (job) => processNotificationJob(job.data),
    { connection: queueConnection }
  )
  notificationsWorker.on("failed", (job, err) => console.error(`Notification failed for org ${job?.data.organizationId}`, err))

  const automationsWorker = new Worker(
    "automations",
    async (job) => {
      switch (job.name) {
        case "evaluate-low-stock":
          return evaluateLowStockForAllOrgs()
        case "evaluate-debt-overdue":
          return evaluateDebtOverdueForAllOrgs()
        case "daily-sales-summary":
          return sendDailySalesSummary((job.data as DailySalesSummaryJob).organizationId)
      }
    },
    { connection: queueConnection }
  )
  automationsWorker.on("failed", (job, err) => console.error(`Automation job "${job?.name}" failed`, err))

  const billingWorker = new Worker(
    "billing",
    async (job) => {
      switch (job.name) {
        case "process-webhook":
          return processBillingWebhookEvent(
            (job.data as ProcessWebhookJob).event as PaystackChargeSuccessEvent
          )
        case "expire-trials":
          return expireOverdueTrials()
      }
    },
    { connection: queueConnection }
  )
  billingWorker.on("failed", (job, err) => console.error(`Billing job "${job?.name}" failed`, err))

  await billingQueue.upsertJobScheduler(
    "trial-expiry-sweep",
    { pattern: "0 1 * * *", tz: "Africa/Lagos" },
    { name: "expire-trials" }
  )

  // Global sweeps (low-stock / debt-overdue aren't per-org time-configured,
  // unlike the daily sales summary — see automationService.ts for that one).
  // Once daily is enough for a heads-up without turning into notification
  // spam.
  await automationsQueue.upsertJobScheduler(
    "low-stock-sweep",
    { pattern: "0 8 * * *", tz: "Africa/Lagos" },
    { name: "evaluate-low-stock" }
  )
  await automationsQueue.upsertJobScheduler(
    "debt-overdue-sweep",
    { pattern: "0 8 * * *", tz: "Africa/Lagos" },
    { name: "evaluate-debt-overdue" }
  )

  console.log("Worker listening on queues: receipts, notifications, automations, billing")
}

main().catch((error) => {
  console.error("Failed to start worker", error)
  process.exit(1)
})
