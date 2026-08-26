import { Transaction } from "sequelize"

import { Product, StockMovement, Supplier } from "../db/models"
import { withOrgTransaction } from "../db/withOrgTransaction"
import { logActivity } from "./activityLog"
import { HttpError } from "../errors"

export interface GoodsReceivedLine {
  productId: string
  quantity: number
  costPrice?: number | null
}

export interface RecordGoodsReceivedInput {
  supplierId: string
  items: GoodsReceivedLine[]
}

export async function recordGoodsReceived(
  organizationId: string,
  userId: string,
  input: RecordGoodsReceivedInput
) {
  if (input.items.length === 0) {
    throw new HttpError("Add at least one item", 400)
  }

  return withOrgTransaction(organizationId, async (t) => {
    const supplier = await Supplier.findOne({
      where: { organizationId, id: input.supplierId },
      transaction: t,
    })
    if (!supplier) throw new HttpError("Supplier not found", 404)

    const productIds = input.items.map((i) => i.productId)
    const products = await Product.findAll({
      where: { organizationId, id: productIds },
      transaction: t,
      lock: Transaction.LOCK.UPDATE,
    })
    const productById = new Map(products.map((p) => [p.id, p]))

    let totalUnits = 0
    for (const line of input.items) {
      const product = productById.get(line.productId)
      if (!product) throw new HttpError("Product not found", 404)
      if (line.quantity <= 0) {
        throw new HttpError(`Quantity must be positive for ${product.name}`, 400)
      }

      await StockMovement.create(
        {
          organizationId,
          productId: product.id,
          change: line.quantity,
          reason: "RESTOCK",
          supplierId: supplier.id,
          performedByUserId: userId,
        },
        { transaction: t }
      )

      product.stockQty += line.quantity
      if (line.costPrice != null) product.costPrice = line.costPrice
      await product.save({ transaction: t })
      totalUnits += line.quantity
    }

    await logActivity(t, {
      organizationId,
      actorUserId: userId,
      action: "STOCK_RECEIVED",
      entityType: "Supplier",
      entityId: supplier.id,
      metadata: { supplierName: supplier.name, itemCount: input.items.length, totalUnits },
    })

    return { supplierId: supplier.id, itemCount: input.items.length, totalUnits }
  })
}
