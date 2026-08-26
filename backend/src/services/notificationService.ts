import { Membership, User, NotificationLog } from "../db/models"
import { withOrgTransaction } from "../db/withOrgTransaction"
import { notificationSender } from "../notifications/sender"
import type { SendNotificationJob } from "../queues/notificationsQueue"

async function resolveOwnerEmail(organizationId: string): Promise<string | null> {
  const membership = await withOrgTransaction(organizationId, (t) =>
    Membership.findOne({
      where: { organizationId, role: "OWNER" },
      order: [["createdAt", "ASC"]],
      transaction: t,
    })
  )
  if (!membership) return null
  const user = await User.findByPk(membership.userId)
  return user?.email ?? null
}

export async function processNotificationJob(job: SendNotificationJob): Promise<void> {
  let status: "SENT" | "FAILED" = "SENT"
  let recipient: string | null = null
  let failureReason: string | undefined

  try {
    if (job.channel === "WHATSAPP") {
      // No Business API provider or approved templates configured — see A.11.
      throw new Error("WhatsApp delivery isn't configured yet")
    }
    recipient = await resolveOwnerEmail(job.organizationId)
    if (!recipient) throw new Error("No owner found for this organization")
    await notificationSender.send({ channel: job.channel, to: recipient, subject: job.subject, body: job.body })
  } catch (error) {
    status = "FAILED"
    failureReason = error instanceof Error ? error.message : "Unknown error"
    console.error("Notification send failed", error)
  }

  await withOrgTransaction(job.organizationId, (t) =>
    NotificationLog.create(
      {
        organizationId: job.organizationId,
        automationRuleId: job.automationRuleId,
        channel: job.channel,
        payload: { subject: job.subject, body: job.body, recipient, failureReason },
        status,
      },
      { transaction: t }
    )
  )
}
