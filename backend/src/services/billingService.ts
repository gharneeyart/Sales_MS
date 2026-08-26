import crypto from "node:crypto"

import { Organization, Plan, Subscription, User } from "../db/models"
import { withOrgTransaction } from "../db/withOrgTransaction"
import { logActivity } from "./activityLog"
import { getUsageAndLimits } from "./entitlements"
import { initializeTransaction } from "../billing/paystackClient"
import { env } from "../config/env"
import { HttpError } from "../errors"

export const TRIAL_DAYS = 14
const BILLING_PERIOD_DAYS = 30

export async function listPlans() {
  return Plan.findAll({ order: [["priceKobo", "ASC"]] })
}

export async function getBillingOverview(organizationId: string) {
  const [subscription, plans, usage] = await Promise.all([
    withOrgTransaction(organizationId, (t) =>
      Subscription.findOne({ where: { organizationId }, transaction: t })
    ),
    listPlans(),
    getUsageAndLimits(organizationId),
  ])

  if (!subscription) throw new HttpError("No subscription found for this organization", 404)
  const plan = plans.find((p) => p.id === subscription.planId)

  return {
    subscription: {
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      plan: plan
        ? { id: plan.id, name: plan.name, priceKobo: plan.priceKobo, limits: plan.limits }
        : null,
    },
    usage,
    plans: plans.map((p) => ({ id: p.id, name: p.name, priceKobo: p.priceKobo, limits: p.limits })),
  }
}

/** Upgrades (moving to a pricier plan) need real payment — send the browser to Paystack. */
export async function startCheckout(organizationId: string, userId: string, planId: string) {
  const [subscription, plan, user] = await Promise.all([
    withOrgTransaction(organizationId, (t) =>
      Subscription.findOne({ where: { organizationId }, transaction: t })
    ),
    Plan.findByPk(planId),
    User.findByPk(userId),
  ])

  if (!subscription) throw new HttpError("No subscription found for this organization", 404)
  if (!plan) throw new HttpError("Plan not found", 404)
  if (!user) throw new HttpError("User not found", 404)

  const currentPlan = await Plan.findByPk(subscription.planId)
  if (currentPlan && plan.priceKobo <= currentPlan.priceKobo) {
    throw new HttpError("Use the downgrade action to move to a plan at this price or lower", 400)
  }

  const reference = `sub_${organizationId}_${crypto.randomUUID()}`
  const { authorizationUrl } = await initializeTransaction({
    email: user.email,
    amountKobo: plan.priceKobo,
    reference,
    callbackUrl: `${env.frontendUrl}/settings?tab=billing`,
    metadata: { organizationId, planId, userId },
  })

  return { authorizationUrl, reference }
}

/** Downgrades (including to Free) apply immediately — no payment involved, so no gateway round-trip. */
export async function downgradePlan(organizationId: string, userId: string, planId: string) {
  const [subscription, plan] = await Promise.all([
    withOrgTransaction(organizationId, (t) =>
      Subscription.findOne({ where: { organizationId }, transaction: t })
    ),
    Plan.findByPk(planId),
  ])

  if (!subscription) throw new HttpError("No subscription found for this organization", 404)
  if (!plan) throw new HttpError("Plan not found", 404)

  const currentPlan = await Plan.findByPk(subscription.planId)
  if (currentPlan && plan.priceKobo > currentPlan.priceKobo) {
    throw new HttpError("Use checkout to move to a pricier plan", 400)
  }

  return withOrgTransaction(organizationId, async (t) => {
    subscription.planId = plan.id
    subscription.status = "ACTIVE"
    subscription.currentPeriodEnd = null
    await subscription.save({ transaction: t })

    await logActivity(t, {
      organizationId,
      actorUserId: userId,
      action: "PLAN_CHANGED",
      entityType: "Subscription",
      entityId: subscription.id,
      metadata: { planName: plan.name },
    })

    return subscription
  })
}

export interface PaystackChargeSuccessEvent {
  event: string
  data: {
    reference: string
    customer: { customer_code: string }
    metadata: { organizationId: string; planId: string; userId: string }
  }
}

/** Runs inside the billing queue worker — the webhook route only verifies the
 * signature and enqueues; this is the actual source of truth for subscription state. */
export async function processBillingWebhookEvent(event: PaystackChargeSuccessEvent) {
  if (event.event !== "charge.success") return

  const { organizationId, planId, userId } = event.data.metadata
  const plan = await Plan.findByPk(planId)
  if (!plan) return

  await withOrgTransaction(organizationId, async (t) => {
    const subscription = await Subscription.findOne({ where: { organizationId }, transaction: t })
    if (!subscription) return

    subscription.planId = plan.id
    subscription.status = "ACTIVE"
    subscription.currentPeriodEnd = new Date(Date.now() + BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000)
    subscription.providerCustomerRef = event.data.customer.customer_code
    subscription.providerSubscriptionRef = event.data.reference
    await subscription.save({ transaction: t })

    await logActivity(t, {
      organizationId,
      actorUserId: userId,
      action: "PLAN_CHANGED",
      entityType: "Subscription",
      entityId: subscription.id,
      metadata: { planName: plan.name, reference: event.data.reference },
    })
  })
}

/** Daily sweep (worker.ts): a trial that ran out without ever being paid for
 * falls back to Free rather than silently keeping Pro-level access forever. */
export async function expireOverdueTrials() {
  const freePlan = await Plan.findOne({ where: { name: "Free" } })
  if (!freePlan) return

  const now = new Date()
  const orgs = await Organization.findAll({ attributes: ["id"] })

  for (const org of orgs) {
    await withOrgTransaction(org.id, async (t) => {
      const subscription = await Subscription.findOne({
        where: { organizationId: org.id, status: "TRIALING" },
        transaction: t,
      })
      if (!subscription?.currentPeriodEnd || subscription.currentPeriodEnd > now) return

      subscription.planId = freePlan.id
      subscription.status = "ACTIVE"
      subscription.currentPeriodEnd = null
      await subscription.save({ transaction: t })
    })
  }
}
