import { Op, col, fn, where as sqlWhere, UniqueConstraintError, type WhereOptions } from "sequelize"

import { Product, StockMovement, User } from "../db/models"
import { withOrgTransaction } from "../db/withOrgTransaction"
import { logActivity } from "./activityLog"
import { assertCanCreateProduct } from "./entitlements"
import { HttpError } from "../errors"

export interface ProductInput {
  name: string
  category?: string | null
  sku?: string | null
  unitLabel: string
  costPrice: number
  wholesalePrice: number
  retailPrice: number
  stockQty: number
  reorderLevel: number
}

export interface ListProductsParams {
  search?: string
  category?: string
  lowStockOnly?: boolean
  page: number
  pageSize: number
}

export async function listProducts(organizationId: string, params: ListProductsParams) {
  const conditions: WhereOptions[] = []
  if (params.search) {
    conditions.push({
      [Op.or]: [
        { name: { [Op.iLike]: `%${params.search}%` } },
        { sku: { [Op.iLike]: `%${params.search}%` } },
      ],
    })
  }
  if (params.category) conditions.push({ category: params.category })
  if (params.lowStockOnly) conditions.push(sqlWhere(col("stock_qty"), Op.lte, col("reorder_level")))

  return withOrgTransaction(organizationId, async (t) => {
    const { rows, count } = await Product.findAndCountAll({
      where: { organizationId, [Op.and]: conditions },
      order: [["name", "ASC"]],
      limit: params.pageSize,
      offset: (params.page - 1) * params.pageSize,
      transaction: t,
    })
    return { products: rows, total: count }
  })
}

export async function getCategories(organizationId: string): Promise<string[]> {
  const rows = (await withOrgTransaction(organizationId, (t) =>
    Product.findAll({
      where: { organizationId, category: { [Op.ne]: null } },
      attributes: [[fn("DISTINCT", col("category")), "category"]],
      order: [["category", "ASC"]],
      raw: true,
      transaction: t,
    })
  )) as unknown as { category: string }[]
  return rows.map((r) => r.category)
}

export async function getProduct(organizationId: string, id: string) {
  const product = await withOrgTransaction(organizationId, (t) =>
    Product.findOne({ where: { organizationId, id }, transaction: t })
  )
  if (!product) throw new HttpError("Product not found", 404)
  return product
}

async function assertUniqueSku<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw new HttpError("A product with this SKU already exists", 409)
    }
    throw error
  }
}

export async function createProduct(organizationId: string, userId: string, input: ProductInput) {
  await assertCanCreateProduct(organizationId)

  return assertUniqueSku(() =>
    withOrgTransaction(organizationId, async (t) => {
      const product = await Product.create(
        { organizationId, ...input, stockQty: 0 },
        { transaction: t }
      )

      if (input.stockQty > 0) {
        await StockMovement.create(
          {
            organizationId,
            productId: product.id,
            change: input.stockQty,
            reason: "ADJUSTMENT",
            performedByUserId: userId,
          },
          { transaction: t }
        )
        product.stockQty = input.stockQty
        await product.save({ transaction: t })
      }

      await logActivity(t, {
        organizationId,
        actorUserId: userId,
        action: "PRODUCT_CREATED",
        entityType: "Product",
        entityId: product.id,
        metadata: { name: product.name },
      })

      return product
    })
  )
}

export async function updateProduct(
  organizationId: string,
  userId: string,
  id: string,
  input: ProductInput
) {
  return assertUniqueSku(() =>
    withOrgTransaction(organizationId, async (t) => {
      const product = await Product.findOne({ where: { organizationId, id }, transaction: t })
      if (!product) throw new HttpError("Product not found", 404)

      const stockDelta = input.stockQty - product.stockQty

      product.name = input.name
      product.category = input.category ?? null
      product.sku = input.sku ?? null
      product.unitLabel = input.unitLabel
      product.costPrice = input.costPrice
      product.wholesalePrice = input.wholesalePrice
      product.retailPrice = input.retailPrice
      product.reorderLevel = input.reorderLevel
      product.stockQty = input.stockQty
      await product.save({ transaction: t })

      if (stockDelta !== 0) {
        await StockMovement.create(
          {
            organizationId,
            productId: product.id,
            change: stockDelta,
            reason: "ADJUSTMENT",
            performedByUserId: userId,
          },
          { transaction: t }
        )
      }

      await logActivity(t, {
        organizationId,
        actorUserId: userId,
        action: "PRODUCT_UPDATED",
        entityType: "Product",
        entityId: product.id,
        metadata: { name: product.name },
      })

      return product
    })
  )
}

export interface StockHistoryEntry {
  id: string
  change: number
  reason: string
  performedBy: string
  createdAt: Date
  balanceAfter: number
}

export async function getStockHistory(
  organizationId: string,
  productId: string,
  limit = 100
): Promise<StockHistoryEntry[]> {
  const product = await getProduct(organizationId, productId)

  const movements = await withOrgTransaction(organizationId, (t) =>
    StockMovement.findAll({
      where: { organizationId, productId },
      include: [{ model: User, attributes: ["name"] }],
      order: [["createdAt", "DESC"]],
      limit,
      transaction: t,
    })
  )

  let balance = product.stockQty
  return movements.map((m) => {
    const entry: StockHistoryEntry = {
      id: m.id,
      change: m.change,
      reason: m.reason,
      performedBy: m.User?.name ?? "Unknown",
      createdAt: m.createdAt,
      balanceAfter: balance,
    }
    balance -= m.change
    return entry
  })
}
