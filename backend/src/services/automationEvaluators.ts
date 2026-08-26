import { Op, QueryTypes, col, where as sqlWhere } from "sequelize"

import { sequelize } from "../db/sequelize"
import { Organization, AutomationRule, Product, Sale, Payment } from "../db/models"
import type {
  DebtOverdueConfig,
  DailySalesSummaryConfig,
  LowStockConfig,
} from "../db/models/AutomationRule"
import { withOrgTransaction } from "../db/withOrgTransaction"
import { enqueueNotification } from "../queues/notificationsQueue"
import { hasNotifiedToday } from "./notificationDedup"
import { startOfTodayWAT } from "../lib/watTime"

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
function formatKobo(kobo: number): string {
  return nairaFormatter.format(kobo / 100).replace("NGN", "₦")
}

export async function evaluateLowStockForAllOrgs(): Promise<void> {
  const orgs = await Organization.findAll({ attributes: ["id"] })
  for (const org of orgs) {
    await evaluateLowStockForOrg(org.id)
  }
}

async function evaluateLowStockForOrg(organizationId: string): Promise<void> {
  const rule = await withOrgTransaction(organizationId, (t) =>
    AutomationRule.findOne({ where: { organizationId, trigger: "LOW_STOCK", enabled: true }, transaction: t })
  )
  if (!rule) return
  if (await hasNotifiedToday(organizationId, rule.id)) return

  const lowStock = await withOrgTransaction(organizationId, (t) =>
    Product.findAll({
      where: { organizationId, [Op.and]: [sqlWhere(col("stock_qty"), Op.lte, col("reorder_level"))] },
      transaction: t,
    })
  )
  if (lowStock.length === 0) return

  const config = rule.config as LowStockConfig
  const lines = lowStock
    .map((p) => `- ${p.name}: ${p.stockQty} ${p.unitLabel}${p.stockQty === 1 ? "" : "s"} left (reorder at ${p.reorderLevel})`)
    .join("\n")

  await enqueueNotification({
    organizationId,
    automationRuleId: rule.id,
    channel: config.channel,
    subject: `${lowStock.length} product${lowStock.length === 1 ? "" : "s"} running low`,
    body: `The following products are at or below their reorder level:\n\n${lines}`,
  })
}

interface OverdueCustomerRow {
  id: string
  name: string
  balance_owed: string
}

export async function evaluateDebtOverdueForAllOrgs(): Promise<void> {
  const orgs = await Organization.findAll({ attributes: ["id"] })
  for (const org of orgs) {
    await evaluateDebtOverdueForOrg(org.id)
  }
}

async function evaluateDebtOverdueForOrg(organizationId: string): Promise<void> {
  const rule = await withOrgTransaction(organizationId, (t) =>
    AutomationRule.findOne({ where: { organizationId, trigger: "DEBT_OVERDUE", enabled: true }, transaction: t })
  )
  if (!rule) return
  if (await hasNotifiedToday(organizationId, rule.id)) return

  const config = rule.config as DebtOverdueConfig
  const cutoff = new Date(Date.now() - config.daysOverdue * 24 * 60 * 60 * 1000)

  const rows = await withOrgTransaction(organizationId, (t) =>
    sequelize.query<OverdueCustomerRow>(
      `
      SELECT c.id, c.name,
        COALESCE(SUM(s.total_amount), 0) - COALESCE(paid.total_paid, 0) AS balance_owed
      FROM customers c
      JOIN sales s ON s.customer_id = c.id AND s.organization_id = :orgId AND s.status != 'CANCELLED'
      LEFT JOIN (
        SELECT s2.customer_id, SUM(p.amount) AS total_paid
        FROM payments p JOIN sales s2 ON s2.id = p.sale_id
        WHERE s2.organization_id = :orgId
        GROUP BY s2.customer_id
      ) paid ON paid.customer_id = c.id
      WHERE c.organization_id = :orgId
      GROUP BY c.id, c.name, paid.total_paid
      HAVING MIN(s.created_at) FILTER (WHERE s.status != 'PAID') <= :cutoff
        AND COALESCE(SUM(s.total_amount), 0) - COALESCE(paid.total_paid, 0) > 0
      `,
      { replacements: { orgId: organizationId, cutoff }, type: QueryTypes.SELECT, transaction: t }
    )
  )
  if (rows.length === 0) return

  const lines = rows.map((r) => `- ${r.name}: owes ${formatKobo(Number(r.balance_owed))}`).join("\n")

  await enqueueNotification({
    organizationId,
    automationRuleId: rule.id,
    channel: config.channel,
    subject: `${rows.length} customer${rows.length === 1 ? "" : "s"} overdue on payment`,
    body: `The following customers have owed money for more than ${config.daysOverdue} days:\n\n${lines}`,
  })
}

export async function sendDailySalesSummary(organizationId: string): Promise<void> {
  const rule = await withOrgTransaction(organizationId, (t) =>
    AutomationRule.findOne({ where: { organizationId, trigger: "SCHEDULE", enabled: true }, transaction: t })
  )
  if (!rule) return

  const config = rule.config as DailySalesSummaryConfig
  const end = startOfTodayWAT()
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)

  const sales = await withOrgTransaction(organizationId, (t) =>
    Sale.findAll({
      where: { organizationId, createdAt: { [Op.gte]: start, [Op.lt]: end }, status: { [Op.ne]: "CANCELLED" } },
      include: [{ model: Payment, as: "Payments" }],
      transaction: t,
    })
  )

  const totalAmount = sales.reduce((sum, s) => sum + s.totalAmount, 0)
  const totalPaid = sales.reduce(
    (sum, s) => sum + (s.Payments ?? []).reduce((a, p) => a + p.amount, 0),
    0
  )

  const body =
    sales.length === 0
      ? "No sales were recorded yesterday."
      : `Yesterday: ${sales.length} sale${sales.length === 1 ? "" : "s"} totalling ${formatKobo(totalAmount)}, ${formatKobo(totalPaid)} collected.`

  await enqueueNotification({
    organizationId,
    automationRuleId: rule.id,
    channel: config.channel,
    subject: "Your daily sales summary",
    body,
  })
}
