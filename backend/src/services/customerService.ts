import { QueryTypes } from "sequelize"

import { sequelize } from "../db/sequelize"
import { Customer, Sale } from "../db/models"
import { withOrgTransaction } from "../db/withOrgTransaction"
import { logActivity } from "./activityLog"
import { HttpError } from "../errors"

export interface ListCustomersParams {
  search?: string
  owesMoneyOnly?: boolean
  page: number
  pageSize: number
}

interface CustomerRow {
  id: string
  name: string
  phone: string | null
  total_spent: string
  balance_owed: string
  last_purchase_date: Date | null
  total_count: string
}

export async function listCustomers(organizationId: string, params: ListCustomersParams) {
  const conditions: string[] = []
  const replacements: Record<string, unknown> = {
    orgId: organizationId,
    pageSize: params.pageSize,
    offset: (params.page - 1) * params.pageSize,
  }
  if (params.search) {
    conditions.push("name ILIKE :search")
    replacements.search = `%${params.search}%`
  }
  if (params.owesMoneyOnly) conditions.push("balance_owed > 0")
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

  const rows = await withOrgTransaction(organizationId, (t) =>
    sequelize.query<CustomerRow>(
      `
      WITH customer_totals AS (
        SELECT
          c.id, c.name, c.phone,
          COALESCE(sale_totals.total_amount, 0) AS total_spent,
          COALESCE(sale_totals.total_amount, 0) - COALESCE(payment_totals.total_paid, 0) AS balance_owed,
          sale_totals.last_purchase_date
        FROM customers c
        LEFT JOIN (
          SELECT customer_id, SUM(total_amount) AS total_amount, MAX(created_at) AS last_purchase_date
          FROM sales
          WHERE organization_id = :orgId AND status != 'CANCELLED' AND customer_id IS NOT NULL
          GROUP BY customer_id
        ) sale_totals ON sale_totals.customer_id = c.id
        LEFT JOIN (
          SELECT s.customer_id, SUM(p.amount) AS total_paid
          FROM payments p
          JOIN sales s ON s.id = p.sale_id
          WHERE s.organization_id = :orgId AND s.customer_id IS NOT NULL
          GROUP BY s.customer_id
        ) payment_totals ON payment_totals.customer_id = c.id
        WHERE c.organization_id = :orgId
      )
      SELECT *, COUNT(*) OVER() AS total_count
      FROM customer_totals
      ${whereClause}
      ORDER BY name ASC
      LIMIT :pageSize OFFSET :offset
      `,
      { replacements, type: QueryTypes.SELECT, transaction: t }
    )
  )

  const customers = rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    totalSpent: Number(r.total_spent),
    balanceOwed: Number(r.balance_owed),
    lastPurchaseDate: r.last_purchase_date,
  }))

  return { customers, total: rows.length ? Number(rows[0].total_count) : 0 }
}

export async function getCustomer(organizationId: string, customerId: string) {
  const customer = await withOrgTransaction(organizationId, (t) =>
    Customer.findOne({ where: { organizationId, id: customerId }, transaction: t })
  )
  if (!customer) throw new HttpError("Customer not found", 404)

  const sales = await withOrgTransaction(organizationId, (t) =>
    Sale.findAll({
      where: { organizationId, customerId },
      order: [["createdAt", "DESC"]],
      include: [{ association: "Payments" }],
      transaction: t,
    })
  )

  const history = sales.map((sale) => {
    const amountPaid = (sale.Payments ?? []).reduce((sum, p) => sum + p.amount, 0)
    return {
      id: sale.id,
      receiptNumber: sale.receiptNumber,
      createdAt: sale.createdAt,
      totalAmount: sale.totalAmount,
      balance: sale.totalAmount - amountPaid,
      status: sale.status,
    }
  })

  const totalSpent = history.reduce((sum, s) => sum + s.totalAmount, 0)
  const balanceOwed = history.reduce((sum, s) => sum + s.balance, 0)

  return {
    customer,
    history,
    summary: { totalSpent, balanceOwed, orderCount: history.length },
  }
}

export interface CustomerInput {
  name: string
  phone?: string | null
  notes?: string | null
}

export async function createCustomer(organizationId: string, userId: string, input: CustomerInput) {
  return withOrgTransaction(organizationId, async (t) => {
    const customer = await Customer.create({ organizationId, ...input }, { transaction: t })
    await logActivity(t, {
      organizationId,
      actorUserId: userId,
      action: "CUSTOMER_CREATED",
      entityType: "Customer",
      entityId: customer.id,
      metadata: { name: customer.name },
    })
    return customer
  })
}

export async function updateCustomer(
  organizationId: string,
  userId: string,
  customerId: string,
  input: CustomerInput
) {
  return withOrgTransaction(organizationId, async (t) => {
    const customer = await Customer.findOne({ where: { organizationId, id: customerId }, transaction: t })
    if (!customer) throw new HttpError("Customer not found", 404)

    customer.name = input.name
    customer.phone = input.phone ?? null
    customer.notes = input.notes ?? null
    await customer.save({ transaction: t })

    await logActivity(t, {
      organizationId,
      actorUserId: userId,
      action: "CUSTOMER_UPDATED",
      entityType: "Customer",
      entityId: customer.id,
      metadata: { name: customer.name },
    })
    return customer
  })
}
