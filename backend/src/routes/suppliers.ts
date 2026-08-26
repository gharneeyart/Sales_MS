import { Router } from "express"
import { z } from "zod"

import { authenticate } from "../middleware/authenticate"
import { validateBody } from "../middleware/validate"
import { HttpError } from "../errors"
import { createSupplier, getSupplier, listSuppliers, updateSupplier } from "../services/supplierService"

export const suppliersRouter = Router()
suppliersRouter.use(authenticate)

suppliersRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25))

    const result = await listSuppliers(req.auth!.orgId, {
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      page,
      pageSize,
    })

    res.json({ suppliers: result.suppliers, total: result.total, page, pageSize })
  } catch (error) {
    next(error)
  }
})

suppliersRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await getSupplier(req.auth!.orgId, req.params.id as string))
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
})

suppliersRouter.post("/", validateBody(supplierSchema), async (req, res, next) => {
  try {
    const supplier = await createSupplier(req.auth!.orgId, req.auth!.sub, {
      ...req.body,
      phone: req.body.phone || null,
      notes: req.body.notes || null,
    })
    res.status(201).json(supplier)
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

suppliersRouter.patch("/:id", validateBody(supplierSchema), async (req, res, next) => {
  try {
    const supplier = await updateSupplier(req.auth!.orgId, req.auth!.sub, req.params.id as string, {
      ...req.body,
      phone: req.body.phone || null,
      notes: req.body.notes || null,
    })
    res.json(supplier)
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})
