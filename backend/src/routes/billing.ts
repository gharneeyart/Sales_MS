import { Router } from "express"
import { z } from "zod"

import { authenticate } from "../middleware/authenticate"
import { requireRole } from "../middleware/requireRole"
import { validateBody } from "../middleware/validate"
import { HttpError } from "../errors"
import { getBillingOverview, startCheckout, downgradePlan } from "../services/billingService"
import { verifyWebhookSignature } from "../billing/paystackClient"
import { enqueueBillingWebhookEvent } from "../queues/billingQueue"

export const billingRouter = Router()

// Paystack calls this directly — no user session, authenticated only by the
// HMAC signature over the raw body. Must come before the authenticate guard
// below, which applies to every other route on this router.
billingRouter.post("/webhook", (req, res) => {
  const signature = req.header("x-paystack-signature")
  if (!req.rawBody || !verifyWebhookSignature(req.rawBody, signature)) {
    res.status(401).json({ error: "Invalid signature" })
    return
  }

  // Ack immediately — the billing queue worker is the source of truth that
  // actually updates Subscription state (A.8, and Phase 8's "webhook handler
  // as source of truth, processed via the billing queue").
  enqueueBillingWebhookEvent(req.body)
  res.status(200).json({ received: true })
})

billingRouter.use(authenticate)

billingRouter.get("/", async (req, res, next) => {
  try {
    res.json(await getBillingOverview(req.auth!.orgId))
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

const planSchema = z.object({
  planId: z.uuid(),
})

billingRouter.post("/checkout", requireRole("OWNER"), validateBody(planSchema), async (req, res, next) => {
  try {
    res.json(await startCheckout(req.auth!.orgId, req.auth!.sub, req.body.planId))
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

billingRouter.post("/downgrade", requireRole("OWNER"), validateBody(planSchema), async (req, res, next) => {
  try {
    res.json(await downgradePlan(req.auth!.orgId, req.auth!.sub, req.body.planId))
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})
