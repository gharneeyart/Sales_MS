import { QueryTypes, type Transaction } from "sequelize"

import { sequelize } from "../db/sequelize"
import { withOrgTransaction } from "../db/withOrgTransaction"
import { HttpError } from "../errors"

const MAX_RANGE_DAYS = 366
const WAT_OFFSET_MS = 60 * 60 * 1000

export interface DateRange {
  from: Date
  to: Date
}

/** Current WAT month-to-date, used when the caller doesn't pass a range. */
function defaultRange(): DateRange {
  const watNow = new Date(Date.now() + WAT_OFFSET_MS)
  const monthStartUtc = Date.UTC(watNow.getUTCFullYear(), watNow.getUTCMonth(), 1)
  return { from: new Date(monthStartUtc - WAT_OFFSET_MS), to: new Date() }
}

export function resolveDateRange(fromParam?: string, toParam?: string): DateRange {
  if (!fromParam && !toParam) return defaultRange()

  const from = fromParam ? new Date(fromParam) : defaultRange().from
  const to = toParam ? new Date(toParam) : new Date()
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new HttpError("Invalid date range", 400)
  }
  if (from > to) {
    throw new HttpError("Start date must be before end date", 400)
  }
  if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * 24 * 60 * 60 * 1000) {
    throw new HttpError(`Date range can't exceed ${MAX_RANGE_DAYS} days`, 400)
  }
  return { from, to }
}

interface SalesOverTimeRow {
  bucket: string
  revenue: string
}

async function getSalesOverTime(organizationId: string, range: DateRange, t: Transaction) {
  const spanDays = (range.to.getTime() - range.from.getTime()) / (24 * 60 * 60 * 1000)
  const granularity = spanDays > 45 ? "week" : "day"
  const truncUnit = granularity === "week" ? "week" : "day"
  const step = granularity === "week" ? "1 week" : "1 day"

  // Zero-fills empty buckets via generate_series so a sparse range (e.g. one sale in a
  // 7-day window) still renders as a full time axis instead of a single stray bar.
  const rows = await sequelize.query<SalesOverTimeRow>(
    `
    SELECT series.bucket AS bucket, COALESCE(SUM(s.total_amount), 0) AS revenue
    FROM generate_series(
      DATE_TRUNC(:truncUnit, :from::timestamptz AT TIME ZONE 'Africa/Lagos'),
      DATE_TRUNC(:truncUnit, (:to::timestamptz - interval '1 second') AT TIME ZONE 'Africa/Lagos'),
      :step::interval
    ) AS series(bucket)
    LEFT JOIN sales s
      ON DATE_TRUNC(:truncUnit, s.created_at AT TIME ZONE 'Africa/Lagos') = series.bucket
      AND s.organization_id = :orgId AND s.status != 'CANCELLED'
      AND s.created_at >= :from AND s.created_at < :to
    GROUP BY series.bucket
    ORDER BY series.bucket ASC
    `,
    {
      replacements: { orgId: organizationId, from: range.from, to: range.to, truncUnit, step },
      type: QueryTypes.SELECT,
      transaction: t,
    }
  )

  return {
    granularity: granularity as "day" | "week",
    points: rows.map((r) => ({ bucket: r.bucket, revenue: Number(r.revenue) })),
  }
}

interface TopProductRow {
  product_id: string
  name: string
  units: string
  revenue: string
}

async function getTopProducts(organizationId: string, range: DateRange, t: Transaction) {
  async function query(orderBy: "revenue" | "units") {
    return sequelize.query<TopProductRow>(
      `
      SELECT p.id AS product_id, p.name,
        SUM(si.quantity) AS units,
        SUM(si.quantity * si.unit_price_at_sale) AS revenue
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id AND s.status != 'CANCELLED'
      JOIN products p ON p.id = si.product_id
      WHERE si.organization_id = :orgId AND s.created_at >= :from AND s.created_at < :to
      GROUP BY p.id, p.name
      ORDER BY ${orderBy} DESC
      LIMIT 5
      `,
      { replacements: { orgId: organizationId, from: range.from, to: range.to }, type: QueryTypes.SELECT, transaction: t }
    )
  }

  const [byRevenue, byUnits] = await Promise.all([query("revenue"), query("units")])
  const shape = (rows: TopProductRow[]) =>
    rows.map((r) => ({ productId: r.product_id, name: r.name, units: Number(r.units), revenue: Number(r.revenue) }))

  return { byRevenue: shape(byRevenue), byUnits: shape(byUnits) }
}

interface ProfitRow {
  revenue: string | null
  cost: string | null
}

async function getProfit(organizationId: string, range: DateRange, t: Transaction) {
  const [row] = await sequelize.query<ProfitRow>(
    `
    SELECT SUM(si.quantity * si.unit_price_at_sale) AS revenue,
      SUM(si.quantity * si.cost_at_sale) AS cost
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id AND s.status != 'CANCELLED'
    WHERE si.organization_id = :orgId AND s.created_at >= :from AND s.created_at < :to
    `,
    { replacements: { orgId: organizationId, from: range.from, to: range.to }, type: QueryTypes.SELECT, transaction: t }
  )

  const revenue = Number(row?.revenue ?? 0)
  const cost = Number(row?.cost ?? 0)
  return { revenue, cost, profit: revenue - cost }
}

interface DebtorRow {
  id: string
  name: string
  balance: string
}

async function getOutstandingDebts(organizationId: string, t: Transaction) {
  const rows = await sequelize.query<DebtorRow>(
    `
    WITH balances AS (
      SELECT c.id, c.name,
        COALESCE(SUM(s.total_amount), 0) - COALESCE(paid.total_paid, 0) AS balance
      FROM customers c
      JOIN sales s ON s.customer_id = c.id AND s.organization_id = :orgId AND s.status != 'CANCELLED'
      LEFT JOIN (
        SELECT s2.customer_id, SUM(p.amount) AS total_paid
        FROM payments p JOIN sales s2 ON s2.id = p.sale_id
        WHERE s2.organization_id = :orgId
        GROUP BY s2.customer_id
      ) paid ON paid.customer_id = c.id
      WHERE c.organization_id = :orgId
      GROUP BY c.id, c.name, paid.total_paid
    )
    SELECT * FROM balances WHERE balance > 0 ORDER BY balance DESC
    `,
    { replacements: { orgId: organizationId }, type: QueryTypes.SELECT, transaction: t }
  )

  const totalOwed = rows.reduce((sum, r) => sum + Number(r.balance), 0)
  const topDebtors = rows.slice(0, 5).map((r) => ({ customerId: r.id, name: r.name, balance: Number(r.balance) }))
  return { totalOwed, topDebtors }
}

interface PaymentMethodRow {
  method: string
  total: string
}

async function getPaymentBreakdown(organizationId: string, range: DateRange, t: Transaction) {
  const rows = await sequelize.query<PaymentMethodRow>(
    `
    SELECT method, SUM(amount) AS total
    FROM payments
    WHERE organization_id = :orgId AND created_at >= :from AND created_at < :to
    GROUP BY method
    `,
    { replacements: { orgId: organizationId, from: range.from, to: range.to }, type: QueryTypes.SELECT, transaction: t }
  )
  return rows.map((r) => ({ method: r.method, total: Number(r.total) }))
}

interface InventoryHealthRow {
  low_stock_count: string
  total_stock_value: string | null
}

async function getInventoryHealth(organizationId: string, t: Transaction) {
  const [row] = await sequelize.query<InventoryHealthRow>(
    `
    SELECT COUNT(*) FILTER (WHERE stock_qty <= reorder_level) AS low_stock_count,
      COALESCE(SUM(stock_qty * cost_price), 0) AS total_stock_value
    FROM products
    WHERE organization_id = :orgId AND deleted_at IS NULL
    `,
    { replacements: { orgId: organizationId }, type: QueryTypes.SELECT, transaction: t }
  )
  return {
    lowStockCount: Number(row?.low_stock_count ?? 0),
    totalStockValue: Number(row?.total_stock_value ?? 0),
  }
}

export async function getReports(organizationId: string, range: DateRange) {
  return withOrgTransaction(organizationId, async (t) => {
    const [salesOverTime, topProducts, profit, outstandingDebts, paymentBreakdown, inventoryHealth] =
      await Promise.all([
        getSalesOverTime(organizationId, range, t),
        getTopProducts(organizationId, range, t),
        getProfit(organizationId, range, t),
        getOutstandingDebts(organizationId, t),
        getPaymentBreakdown(organizationId, range, t),
        getInventoryHealth(organizationId, t),
      ])

    return {
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      salesOverTime,
      topProducts,
      profit,
      outstandingDebts,
      paymentBreakdown,
      inventoryHealth,
    }
  })
}
