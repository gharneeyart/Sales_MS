import { Router } from "express"
import { z } from "zod"

import { authenticate } from "../middleware/authenticate"
import { requireRole } from "../middleware/requireRole"
import { validateBody } from "../middleware/validate"
import { HttpError } from "../errors"
import { getAutomationRules, upsertAutomationRule } from "../services/automationService"
import type { AutomationTrigger } from "../db/models/AutomationRule"

export const automationsRouter = Router()
automationsRouter.use(authenticate, requireRole("OWNER"))

const TRIGGERS: AutomationTrigger[] = ["LOW_STOCK", "DEBT_OVERDUE", "SCHEDULE"]

automationsRouter.get("/", async (req, res, next) => {
  try {
    res.json(await getAutomationRules(req.auth!.orgId))
  } catch (error) {
    next(error)
  }
})

const configSchema = z.object({
  enabled: z.boolean(),
  config: z.object({
    channel: z.enum(["EMAIL", "WHATSAPP"]),
    daysOverdue: z.number().int().positive().optional(),
    sendTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time")
      .optional(),
  }),
})

automationsRouter.put("/:trigger", validateBody(configSchema), async (req, res, next) => {
  try {
    const trigger = req.params.trigger as string
    if (!TRIGGERS.includes(trigger as AutomationTrigger)) {
      res.status(404).json({ error: "Unknown automation" })
      return
    }
    const rule = await upsertAutomationRule(req.auth!.orgId, trigger as AutomationTrigger, req.body)
    res.json(rule)
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})
