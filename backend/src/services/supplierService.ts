import { Op } from "sequelize"

import { Supplier } from "../db/models"
import { withOrgTransaction } from "../db/withOrgTransaction"
import { logActivity } from "./activityLog"
import { HttpError } from "../errors"

export interface ListSuppliersParams {
  search?: string
  page: number
  pageSize: number
}

export async function listSuppliers(organizationId: string, params: ListSuppliersParams) {
  const where: Record<string, unknown> = { organizationId }
  if (params.search) where.name = { [Op.iLike]: `%${params.search}%` }

  return withOrgTransaction(organizationId, async (t) => {
    const { rows, count } = await Supplier.findAndCountAll({
      where,
      order: [["name", "ASC"]],
      limit: params.pageSize,
      offset: (params.page - 1) * params.pageSize,
      transaction: t,
    })
    return { suppliers: rows, total: count }
  })
}

export async function getSupplier(organizationId: string, id: string) {
  const supplier = await withOrgTransaction(organizationId, (t) =>
    Supplier.findOne({ where: { organizationId, id }, transaction: t })
  )
  if (!supplier) throw new HttpError("Supplier not found", 404)
  return supplier
}

export interface SupplierInput {
  name: string
  phone?: string | null
  notes?: string | null
}

export async function createSupplier(organizationId: string, userId: string, input: SupplierInput) {
  return withOrgTransaction(organizationId, async (t) => {
    const supplier = await Supplier.create({ organizationId, ...input }, { transaction: t })
    await logActivity(t, {
      organizationId,
      actorUserId: userId,
      action: "SUPPLIER_CREATED",
      entityType: "Supplier",
      entityId: supplier.id,
      metadata: { name: supplier.name },
    })
    return supplier
  })
}

export async function updateSupplier(
  organizationId: string,
  userId: string,
  id: string,
  input: SupplierInput
) {
  return withOrgTransaction(organizationId, async (t) => {
    const supplier = await Supplier.findOne({ where: { organizationId, id }, transaction: t })
    if (!supplier) throw new HttpError("Supplier not found", 404)

    supplier.name = input.name
    supplier.phone = input.phone ?? null
    supplier.notes = input.notes ?? null
    await supplier.save({ transaction: t })

    await logActivity(t, {
      organizationId,
      actorUserId: userId,
      action: "SUPPLIER_UPDATED",
      entityType: "Supplier",
      entityId: supplier.id,
      metadata: { name: supplier.name },
    })
    return supplier
  })
}
