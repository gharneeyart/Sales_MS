import { Queue } from "bullmq"

import { queueConnection } from "./connection"
import type { NotificationChannel } from "../db/models/AutomationRule"

export interface SendNotificationJob {
  organizationId: string
  automationRuleId: string | null
  channel: NotificationChannel
  subject: string
  body: string
}

export const notificationsQueue = new Queue<SendNotificationJob>("notifications", {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 200,
    removeOnFail: 500,
  },
})

export function enqueueNotification(job: SendNotificationJob) {
  return notificationsQueue.add("send", job)
}
