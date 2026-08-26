import type { NotificationChannel } from "../db/models/AutomationRule"

export interface SendInput {
  channel: NotificationChannel
  to: string
  subject: string
  body: string
}

export interface NotificationSender {
  send(input: SendInput): Promise<void>
}

/**
 * Dev/default sender — no email or WhatsApp provider is configured yet, so
 * this just logs what would have gone out. Swap for a real implementation
 * (e.g. Resend/SMTP for email; WhatsApp needs a Business API provider and
 * pre-approved templates, per A.11) the same way cloudinaryStorage.ts
 * replaced the local-disk ObjectStorage adapter.
 */
class ConsoleNotificationSender implements NotificationSender {
  async send(input: SendInput): Promise<void> {
    console.log(`[notification:${input.channel}] to=${input.to} — ${input.subject}\n${input.body}`)
  }
}

export const notificationSender: NotificationSender = new ConsoleNotificationSender()
