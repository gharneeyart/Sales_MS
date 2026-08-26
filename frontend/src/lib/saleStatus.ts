import type { SaleStatus } from "./api"

export const SALE_STATUS_LABEL: Record<SaleStatus, string> = {
  PAID: "Paid",
  PARTIALLY_PAID: "Part-paid",
  PENDING: "Unpaid",
  CANCELLED: "Cancelled",
}

export const SALE_STATUS_VARIANT: Record<SaleStatus, "success" | "warning" | "destructive" | "secondary"> = {
  PAID: "success",
  PARTIALLY_PAID: "warning",
  PENDING: "destructive",
  CANCELLED: "secondary",
}
