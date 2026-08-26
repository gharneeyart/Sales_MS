import { Subscription, Plan, Product, Membership, Invite } from "../db/models"
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

// Pending invites count toward the seat too — otherwise an owner could invite
// past the limit and only find out when each invite happens to be accepted.
async function countStaffSeats(organizationId: string): Promise<number> {
  const [staffCount, pendingInvites] = await withOrgTransaction(organizationId, (t) =>
    Promise.all([
      Membership.count({ where: { organizationId }, transaction: t }),
      Invite.count({ where: { organizationId, status: "PENDING" }, transaction: t }),
    ])
  )
  return staffCount + pendingInvites
}

export async function assertCanInviteStaff(organizationId: string): Promise<void> {
  const limits = await getPlanLimits(organizationId)
  if (!limits.maxStaff) return

  const seats = await countStaffSeats(organizationId)
  if (seats >= limits.maxStaff) {
    throw new HttpError(
      `You've reached your plan's staff limit (${limits.maxStaff}). Upgrade to invite more.`,
      403
    )
  }
}

export interface UsageAndLimits {
  products: { used: number; limit: number | null }
  staff: { used: number; limit: number | null }
}

export async function getUsageAndLimits(organizationId: string): Promise<UsageAndLimits> {
  const limits = await getPlanLimits(organizationId)
  const [productCount, seats] = await Promise.all([
    withOrgTransaction(organizationId, (t) => Product.count({ where: { organizationId }, transaction: t })),
    countStaffSeats(organizationId),
  ])

  return {
    products: { used: productCount, limit: limits.maxProducts ?? null },
    staff: { used: seats, limit: limits.maxStaff ?? null },
  }
}
