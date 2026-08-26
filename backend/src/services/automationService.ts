import { AutomationRule } from "../db/models"
import type { AutomationConfig, AutomationTrigger, DailySalesSummaryConfig } from "../db/models/AutomationRule"
import { withOrgTransaction } from "../db/withOrgTransaction"
import { automationsQueue, dailySalesSummaryJobId } from "../queues/automationsQueue"
import { HttpError } from "../errors"

const DEFAULT_CONFIG: Record<AutomationTrigger, AutomationConfig> = {
  LOW_STOCK: { channel: "EMAIL" },
  DEBT_OVERDUE: { daysOverdue: 14, channel: "EMAIL" },
  SCHEDULE: { sendTime: "07:00", channel: "EMAIL" },
}

const TRIGGERS: AutomationTrigger[] = ["LOW_STOCK", "DEBT_OVERDUE", "SCHEDULE"]

export interface AutomationRuleView {
  trigger: AutomationTrigger
  enabled: boolean
  config: AutomationConfig
}

export async function getAutomationRules(organizationId: string): Promise<AutomationRuleView[]> {
  const rules = await withOrgTransaction(organizationId, (t) =>
    AutomationRule.findAll({ where: { organizationId }, transaction: t })
  )
  const byTrigger = new Map(rules.map((r) => [r.trigger, r]))

  return TRIGGERS.map((trigger) => {
    const existing = byTrigger.get(trigger)
    return {
      trigger,
      enabled: existing?.enabled ?? false,
      config: existing?.config ?? DEFAULT_CONFIG[trigger],
    }
  })
}

function assertValidConfig(trigger: AutomationTrigger, config: AutomationConfig) {
  if (!("channel" in config) || (config.channel !== "EMAIL" && config.channel !== "WHATSAPP")) {
    throw new HttpError("Choose a notification channel", 400)
  }
  if (trigger === "DEBT_OVERDUE") {
    const daysOverdue = (config as { daysOverdue?: unknown }).daysOverdue
    if (typeof daysOverdue !== "number" || daysOverdue < 1) {
      throw new HttpError("Days overdue must be at least 1", 400)
    }
  }
  if (trigger === "SCHEDULE") {
    const sendTime = (config as { sendTime?: unknown }).sendTime
    if (typeof sendTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(sendTime)) {
      throw new HttpError("Enter a valid send time (HH:mm)", 400)
    }
  }
}

export async function upsertAutomationRule(
  organizationId: string,
  trigger: AutomationTrigger,
  input: { enabled: boolean; config: AutomationConfig }
): Promise<AutomationRuleView> {
  assertValidConfig(trigger, input.config)

  const rule = await withOrgTransaction(organizationId, async (t) => {
    const [rule] = await AutomationRule.findOrCreate({
      where: { organizationId, trigger },
      defaults: { organizationId, trigger, enabled: input.enabled, config: input.config },
      transaction: t,
    })
    rule.enabled = input.enabled
    rule.config = input.config
    await rule.save({ transaction: t })
    return rule
  })

  if (trigger === "SCHEDULE") {
    await syncDailySalesSummarySchedule(organizationId, rule)
  }

  return { trigger: rule.trigger, enabled: rule.enabled, config: rule.config }
}

async function syncDailySalesSummarySchedule(organizationId: string, rule: AutomationRule) {
  const jobId = dailySalesSummaryJobId(organizationId)
  if (!rule.enabled) {
    await automationsQueue.removeJobScheduler(jobId)
    return
  }
  const config = rule.config as DailySalesSummaryConfig
  const [hour, minute] = config.sendTime.split(":").map(Number)
  await automationsQueue.upsertJobScheduler(
    jobId,
    { pattern: `${minute} ${hour} * * *`, tz: "Africa/Lagos" },
    { name: "daily-sales-summary", data: { organizationId } }
  )
}
