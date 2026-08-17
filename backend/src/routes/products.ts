import { Router } from "express"
import { z } from "zod"

import { authenticate } from "../middleware/authenticate"
import { validateBody } from "../middleware/validate"
import { HttpError } from "../errors"
import {
  createProduct,
  getCategories,
  getProduct,
  getStockHistory,
  listProducts,
  updateProduct,
} from "../services/productService"

export const productsRouter = Router()
productsRouter.use(authenticate)

productsRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25))

    const result = await listProducts(req.auth!.orgId, {
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      category: typeof req.query.category === "string" ? req.query.category : undefined,
      lowStockOnly: req.query.lowStockOnly === "true",
      page,
      pageSize,
    })

    res.json({ products: result.products, total: result.total, page, pageSize })
  } catch (error) {
    next(error)
  }
})

productsRouter.get("/categories", async (req, res, next) => {
  try {
    res.json(await getCategories(req.auth!.orgId))
  } catch (error) {
    next(error)
  }
})

productsRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await getProduct(req.auth!.orgId, req.params.id as string))
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

productsRouter.get("/:id/stock-history", async (req, res, next) => {
  try {
    res.json(await getStockHistory(req.auth!.orgId, req.params.id as string))
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  category: z.string().trim().nullable().optional(),
  sku: z.string().trim().nullable().optional(),
  unitLabel: z.string().trim().min(1, "Unit is required"),
  costPrice: z.number().int().min(0, "Cost price can't be negative"),
  wholesalePrice: z.number().int().min(0, "Wholesale price can't be negative"),
  retailPrice: z.number().int().min(0, "Retail price can't be negative"),
  stockQty: z.number().int().min(0, "Stock can't be negative"),
  reorderLevel: z.number().int().min(0, "Reorder level can't be negative"),
})

productsRouter.post("/", validateBody(productSchema), async (req, res, next) => {
  try {
    const product = await createProduct(req.auth!.orgId, req.auth!.sub, {
      ...req.body,
      category: req.body.category || null,
      sku: req.body.sku || null,
    })
    res.status(201).json(product)
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

productsRouter.patch("/:id", validateBody(productSchema), async (req, res, next) => {
  try {
    const product = await updateProduct(req.auth!.orgId, req.auth!.sub, req.params.id as string, {
      ...req.body,
      category: req.body.category || null,
      sku: req.body.sku || null,
    })
    res.json(product)
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})
