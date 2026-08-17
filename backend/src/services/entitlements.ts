import { Subscription, Plan, Product } from "../db/models"
import type { PlanLimits } from "../db/models/Plan"
import { withOrgTransaction } from "../db/withOrgTransaction"
import { HttpError } from "../errors"

export async function getPlanLimits(organizationId: string): Promise<PlanLimits> {
  const subscription = await withOrgTransaction(organizationId, (t) =>
    Subscription.findOne({ where: { organizationId }, transaction: t })
  )
  if (!subscription) return {}
  const plan = await Plan.findByPk(subscription.planId)
  return plan?.limits ?? {}
}

export async function assertCanCreateProduct(organizationId: string): Promise<void> {
  const limits = await getPlanLimits(organizationId)
  if (!limits.maxProducts) return

  const count = await withOrgTransaction(organizationId, (t) =>
    Product.count({ where: { organizationId }, transaction: t })
  )

  if (count >= limits.maxProducts) {
    throw new HttpError(
      `You've reached your plan's product limit (${limits.maxProducts}). Upgrade to add more.`,
      403
    )
  }
}
