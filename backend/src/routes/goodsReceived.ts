import { Router } from "express"
import { z } from "zod"

import { authenticate } from "../middleware/authenticate"
import { validateBody } from "../middleware/validate"
import { HttpError } from "../errors"
import { recordGoodsReceived } from "../services/goodsReceivedService"

export const goodsReceivedRouter = Router()
goodsReceivedRouter.use(authenticate)

const schema = z.object({
  supplierId: z.uuid(),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.number().int().positive("Quantity must be at least 1"),
        costPrice: z.number().int().min(0).nullable().optional(),
      })
    )
    .min(1, "Add at least one item"),
})

goodsReceivedRouter.post("/", validateBody(schema), async (req, res, next) => {
  try {
    const result = await recordGoodsReceived(req.auth!.orgId, req.auth!.sub, req.body)
    res.status(201).json(result)
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})
