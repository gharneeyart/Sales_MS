import { Router } from "express"
import { z } from "zod"

import { authenticate } from "../middleware/authenticate"
import { validateBody } from "../middleware/validate"
import { HttpError } from "../errors"
import { createCustomer, getCustomer, listCustomers, updateCustomer } from "../services/customerService"

export const customersRouter = Router()
customersRouter.use(authenticate)

customersRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25))

    const result = await listCustomers(req.auth!.orgId, {
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      owesMoneyOnly: req.query.owesMoneyOnly === "true",
      page,
      pageSize,
    })

    res.json({ customers: result.customers, total: result.total, page, pageSize })
  } catch (error) {
    next(error)
  }
})

customersRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await getCustomer(req.auth!.orgId, req.params.id as string))
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
})

customersRouter.post("/", validateBody(customerSchema), async (req, res, next) => {
  try {
    const customer = await createCustomer(req.auth!.orgId, req.auth!.sub, {
      ...req.body,
      phone: req.body.phone || null,
      notes: req.body.notes || null,
    })
    res.status(201).json(customer)
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

customersRouter.patch("/:id", validateBody(customerSchema), async (req, res, next) => {
  try {
    const customer = await updateCustomer(req.auth!.orgId, req.auth!.sub, req.params.id as string, {
      ...req.body,
      phone: req.body.phone || null,
      notes: req.body.notes || null,
    })
    res.json(customer)
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})
