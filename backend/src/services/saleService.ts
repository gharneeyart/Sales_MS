import { Op, QueryTypes, Transaction } from "sequelize"

import { sequelize } from "../db/sequelize"
import { Sale, SaleItem, Payment, Product, StockMovement, Customer, User } from "../db/models"
import type { SaleStatus } from "../db/models/Sale"
import type { PriceType } from "../db/models/SaleItem"
import type { PaymentMethod } from "../db/models/Payment"
import { withOrgTransaction } from "../db/withOrgTransaction"
import { logActivity } from "./activityLog"
import { enqueueReceiptGeneration } from "../queues/receiptsQueue"
import { HttpError } from "../errors"

function deriveStatus(totalAmount: number, amountPaid: number): SaleStatus {
  if (amountPaid <= 0) return "PENDING"
  if (amountPaid >= totalAmount) return "PAID"
  return "PARTIALLY_PAID"
}

export interface SaleLineInput {
  productId: string
  quantity: number
  priceType: PriceType
}

export interface CreateSaleInput {
  customerId?: string | null
  items: SaleLineInput[]
  initialPayment?: { amount: number; method: PaymentMethod } | null
}

export async function createSale(organizationId: string, userId: string, input: CreateSaleInput) {
  if (input.items.length === 0) {
    throw new HttpError("A sale needs at least one item", 400)
  }

  const sale = await withOrgTransaction(organizationId, async (t) => {
    const productIds = input.items.map((i) => i.productId)
    const products = await Product.findAll({
      where: { organizationId, id: productIds },
      transaction: t,
      lock: Transaction.LOCK.UPDATE,
    })
    const productById = new Map(products.map((p) => [p.id, p]))

    let totalAmount = 0
    const lines: {
      product: Product
      quantity: number
      unitPrice: number
      priceType: PriceType
    }[] = []

    for (const line of input.items) {
      const product = productById.get(line.productId)
      if (!product) throw new HttpError("Product not found", 404)
      if (line.quantity <= 0) {
        throw new HttpError(`Quantity must be positive for ${product.name}`, 400)
      }
      if (product.stockQty < line.quantity) {
        throw new HttpError(`Not enough stock for ${product.name} (${product.stockQty} available)`, 400)
      }
      const unitPrice = line.priceType === "WHOLESALE" ? product.wholesalePrice : product.retailPrice
      totalAmount += unitPrice * line.quantity
      lines.push({ product, quantity: line.quantity, unitPrice, priceType: line.priceType })
    }

    if (input.initialPayment && input.initialPayment.amount > totalAmount) {
      throw new HttpError("Initial payment can't exceed the sale total", 400)
    }

    const [{ receipt_counter: receiptCounter }] = await sequelize.query<{ receipt_counter: number }>(
      `UPDATE organizations SET receipt_counter = receipt_counter + 1 WHERE id = :orgId RETURNING receipt_counter`,
      { replacements: { orgId: organizationId }, transaction: t, type: QueryTypes.SELECT }
    )
    const receiptNumber = `RCT-${String(receiptCounter).padStart(6, "0")}`

    const amountPaid = input.initialPayment?.amount ?? 0

    const sale = await Sale.create(
      {
        organizationId,
        customerId: input.customerId ?? null,
        totalAmount,
        recordedByUserId: userId,
        receiptNumber,
        status: deriveStatus(totalAmount, amountPaid),
      },
      { transaction: t }
    )

    for (const line of lines) {
      await SaleItem.create(
        {
          organizationId,
          saleId: sale.id,
          productId: line.product.id,
          quantity: line.quantity,
          unitPriceAtSale: line.unitPrice,
          costAtSale: line.product.costPrice,
          priceType: line.priceType,
        },
        { transaction: t }
      )
      await StockMovement.create(
        {
          organizationId,
          productId: line.product.id,
          change: -line.quantity,
          reason: "SALE",
          performedByUserId: userId,
        },
        { transaction: t }
      )
      line.product.stockQty -= line.quantity
      await line.product.save({ transaction: t })
    }

    if (input.initialPayment) {
      await Payment.create(
        {
          organizationId,
          saleId: sale.id,
          amount: input.initialPayment.amount,
          method: input.initialPayment.method,
          receivedByUserId: userId,
        },
        { transaction: t }
      )
    }

    await logActivity(t, {
      organizationId,
      actorUserId: userId,
      action: "SALE_RECORDED",
      entityType: "Sale",
      entityId: sale.id,
      metadata: { receiptNumber, totalAmount },
    })

    return sale
  })

  await enqueueReceiptGeneration({ organizationId, saleId: sale.id })

  return sale
}

export interface ListSalesParams {
  search?: string
  status?: SaleStatus
  dateFrom?: string
  dateTo?: string
  page: number
  pageSize: number
}

export async function listSales(organizationId: string, params: ListSalesParams) {
  const conditions: Record<string, unknown>[] = []
  if (params.search) {
    conditions.push({
      [Op.or]: [
        { receiptNumber: { [Op.iLike]: `%${params.search}%` } },
        { "$Customer.name$": { [Op.iLike]: `%${params.search}%` } },
      ],
    })
  }
  if (params.status) conditions.push({ status: params.status })
  if (params.dateFrom) conditions.push({ createdAt: { [Op.gte]: new Date(params.dateFrom) } })
  if (params.dateTo) conditions.push({ createdAt: { [Op.lte]: new Date(params.dateTo) } })

  return withOrgTransaction(organizationId, async (t) => {
    const { rows, count } = await Sale.findAndCountAll({
      where: { organizationId, [Op.and]: conditions },
      include: [
        { model: Customer, as: "Customer", required: false },
        { model: User, as: "RecordedBy", attributes: ["id", "name"] },
        { model: Payment, as: "Payments" },
      ],
      order: [["createdAt", "DESC"]],
      limit: params.pageSize,
      offset: (params.page - 1) * params.pageSize,
      distinct: true,
      subQuery: false,
      transaction: t,
    })

    const sales = rows.map((sale) => {
      const amountPaid = (sale.Payments ?? []).reduce((sum, p) => sum + p.amount, 0)
      return {
        id: sale.id,
        receiptNumber: sale.receiptNumber,
        customerName: sale.Customer?.name ?? "Walk-in",
        createdAt: sale.createdAt,
        totalAmount: sale.totalAmount,
        amountPaid,
        balance: sale.totalAmount - amountPaid,
        status: sale.status,
        recordedByName: sale.RecordedBy?.name ?? "—",
      }
    })

    return { sales, total: count }
  })
}

export async function getSale(organizationId: string, saleId: string) {
  const sale = await withOrgTransaction(organizationId, (t) =>
    Sale.findOne({
      where: { organizationId, id: saleId },
      include: [
        { model: Customer, as: "Customer", required: false },
        { model: User, as: "RecordedBy", attributes: ["id", "name"] },
        { model: SaleItem, as: "SaleItems", include: [Product] },
        { model: Payment, as: "Payments", include: [{ model: User, as: "ReceivedBy", attributes: ["id", "name"] }] },
      ],
      transaction: t,
    })
  )
  if (!sale) throw new HttpError("Sale not found", 404)
  return sale
}

export async function recordPayment(
  organizationId: string,
  userId: string,
  saleId: string,
  input: { amount: number; method: PaymentMethod }
) {
  if (input.amount <= 0) {
    throw new HttpError("Payment amount must be positive", 400)
  }

  await withOrgTransaction(organizationId, async (t) => {
    const sale = await Sale.findOne({
      where: { organizationId, id: saleId },
      include: [{ model: Payment, as: "Payments" }],
      transaction: t,
    })
    if (!sale) throw new HttpError("Sale not found", 404)

    const amountPaidSoFar = (sale.Payments ?? []).reduce((sum, p) => sum + p.amount, 0)
    const balance = sale.totalAmount - amountPaidSoFar
    if (input.amount > balance) {
      throw new HttpError(`Payment can't exceed the outstanding balance (${balance})`, 400)
    }

    await Payment.create(
      {
        organizationId,
        saleId,
        amount: input.amount,
        method: input.method,
        receivedByUserId: userId,
      },
      { transaction: t }
    )

    sale.status = deriveStatus(sale.totalAmount, amountPaidSoFar + input.amount)
    await sale.save({ transaction: t })

    await logActivity(t, {
      organizationId,
      actorUserId: userId,
      action: "PAYMENT_RECORDED",
      entityType: "Sale",
      entityId: sale.id,
      metadata: { amount: input.amount, method: input.method },
    })
  })

  await enqueueReceiptGeneration({ organizationId, saleId })

  return getSale(organizationId, saleId)
}
