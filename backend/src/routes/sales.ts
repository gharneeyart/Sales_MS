import { Router } from "express"
import { z } from "zod"

import { authenticate } from "../middleware/authenticate"
import { validateBody } from "../middleware/validate"
import { HttpError } from "../errors"
import { createSale, getSale, listSales, recordPayment } from "../services/saleService"
import type { SaleStatus } from "../db/models/Sale"

export const salesRouter = Router()
salesRouter.use(authenticate)

const VALID_STATUSES: SaleStatus[] = ["PENDING", "PARTIALLY_PAID", "PAID", "CANCELLED"]

salesRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25))
    const status = typeof req.query.status === "string" && VALID_STATUSES.includes(req.query.status as SaleStatus)
      ? (req.query.status as SaleStatus)
      : undefined

    const result = await listSales(req.auth!.orgId, {
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      status,
      dateFrom: typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined,
      dateTo: typeof req.query.dateTo === "string" ? req.query.dateTo : undefined,
      page,
      pageSize,
    })

    res.json({ sales: result.sales, total: result.total, page, pageSize })
  } catch (error) {
    next(error)
  }
})

salesRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await getSale(req.auth!.orgId, req.params.id as string))
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

const createSaleSchema = z.object({
  customerId: z.uuid().nullable().optional(),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.number().int().positive("Quantity must be at least 1"),
        priceType: z.enum(["WHOLESALE", "RETAIL"]),
      })
    )
    .min(1, "A sale needs at least one item"),
  initialPayment: z
    .object({
      amount: z.number().int().positive(),
      method: z.enum(["CASH", "TRANSFER", "POS", "OTHER"]),
    })
    .nullable()
    .optional(),
})

salesRouter.post("/", validateBody(createSaleSchema), async (req, res, next) => {
  try {
    const sale = await createSale(req.auth!.orgId, req.auth!.sub, req.body)
    res.status(201).json(sale)
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

const recordPaymentSchema = z.object({
  amount: z.number().int().positive("Amount must be positive"),
  method: z.enum(["CASH", "TRANSFER", "POS", "OTHER"]),
})

salesRouter.post("/:id/payments", validateBody(recordPaymentSchema), async (req, res, next) => {
  try {
    const sale = await recordPayment(req.auth!.orgId, req.auth!.sub, req.params.id as string, req.body)
    res.status(201).json(sale)
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})
