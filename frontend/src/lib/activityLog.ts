import { formatKobo } from "./format"
import type { ActivityLogEntry } from "./api"

const ACTION_LABELS: Record<string, string> = {
  PRODUCT_CREATED: "Product added",
  PRODUCT_UPDATED: "Product updated",
  SALE_RECORDED: "Sale recorded",
  PAYMENT_RECORDED: "Payment received",
  CUSTOMER_CREATED: "Customer added",
  CUSTOMER_UPDATED: "Customer updated",
  SUPPLIER_CREATED: "Supplier added",
  SUPPLIER_UPDATED: "Supplier updated",
  STOCK_RECEIVED: "Stock received",
  MEMBER_JOINED: "Member joined",
  MEMBER_ROLE_CHANGED: "Role changed",
  MEMBER_REMOVED: "Member removed",
  INVITE_REVOKED: "Invite revoked",
  PLAN_CHANGED: "Plan changed",
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

/** What the action affected — a short, human line built from the metadata
 * snapshot each service already logs. Falls back to the entity type + id so
 * an action added later without a case here still renders something useful. */
export function describeAffected(entry: ActivityLogEntry): string {
  const m = entry.metadata as Record<string, unknown>

  switch (entry.action) {
    case "PRODUCT_CREATED":
    case "PRODUCT_UPDATED":
    case "CUSTOMER_CREATED":
    case "CUSTOMER_UPDATED":
    case "SUPPLIER_CREATED":
    case "SUPPLIER_UPDATED":
      return String(m.name ?? entry.entityType)
    case "SALE_RECORDED":
      return `Receipt ${m.receiptNumber} · ${formatKobo(Number(m.totalAmount ?? 0))}`
    case "PAYMENT_RECORDED":
      return `${formatKobo(Number(m.amount ?? 0))} via ${m.method}`
    case "STOCK_RECEIVED":
      return `${m.itemCount} item(s) from ${m.supplierName}`
    case "MEMBER_JOINED":
      return `${m.name} joined as ${m.role === "OWNER" ? "Owner" : "Staff"}`
    case "MEMBER_ROLE_CHANGED":
      return `Now ${m.role === "OWNER" ? "Owner" : "Staff"}`
    case "MEMBER_REMOVED":
      return String(m.name ?? "")
    case "INVITE_REVOKED":
      return String(m.email ?? "")
    case "PLAN_CHANGED":
      return `Now on ${m.planName}`
    default:
      return `${entry.entityType} ${entry.entityId.slice(0, 8)}`
  }
}
