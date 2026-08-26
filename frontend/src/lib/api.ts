import { getAccessToken, setAccessToken } from "./auth/tokenStore"

const API_URL = import.meta.env.VITE_API_URL as string

export type MembershipRole = "OWNER" | "STAFF"

export interface SessionUser {
  id: string
  name: string
  email: string
}

export interface SessionOrganization {
  id: string
  name: string
}

export interface Session {
  accessToken: string
  user: SessionUser
  organization: SessionOrganization
  role: MembershipRole
}

export class ApiError extends Error {
  status: number
  issues?: { message: string; path: (string | number)[] }[]
  constructor(status: number, message: string, issues?: ApiError["issues"]) {
    super(message)
    this.status = status
    this.issues = issues
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  /** Internal — prevents the refresh-and-retry loop from retrying itself. */
  skipAuthRetry?: boolean
}

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getAccessToken()
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include", // carries the httpOnly refresh cookie (A.7)
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (res.status === 204) {
    return undefined as T
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? `Request failed with ${res.status}`, data.issues)
  }

  return data as T
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, options)
  } catch (error) {
    // A 401 on anything but the refresh call itself means the access token
    // expired mid-session — try a silent refresh once and replay the
    // original request before giving up (A.7's refresh flow).
    if (error instanceof ApiError && error.status === 401 && !options.skipAuthRetry) {
      const session = await refresh().catch(() => null)
      if (session) {
        return rawRequest<T>(path, options)
      }
    }
    throw error
  }
}

export function signup(input: {
  businessName: string
  name: string
  email: string
  password: string
}) {
  return request<Session>("/api/auth/signup", { body: input })
}

export function login(input: { email: string; password: string }) {
  return request<Session>("/api/auth/login", { body: input })
}

export async function refresh(): Promise<Session> {
  const session = await rawRequest<Session>("/api/auth/refresh", {
    method: "POST",
    skipAuthRetry: true,
  })
  setAccessToken(session.accessToken)
  return session
}

export async function logout(): Promise<void> {
  await request("/api/auth/logout", { method: "POST" })
  setAccessToken(null)
}

export function me() {
  return request<{ user: SessionUser; organization: SessionOrganization; role: MembershipRole }>(
    "/api/auth/me"
  )
}

export function createInvite(input: { email: string }) {
  return request<{ token: string }>("/api/invites", { body: input })
}

export function getInviteDetails(token: string) {
  return rawRequest<{ organizationName: string; email: string; role: MembershipRole }>(
    `/api/invites/${token}`,
    { skipAuthRetry: true }
  )
}

export function acceptInvite(input: { token: string; name: string; password: string }) {
  return rawRequest<Session>(`/api/invites/${input.token}/accept`, {
    method: "POST",
    body: { name: input.name, password: input.password },
    skipAuthRetry: true,
  })
}

export interface BrandSettings {
  displayName: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  accentColor: string
}

export function getBranding() {
  return request<BrandSettings>("/api/settings/branding")
}

export function updateBranding(input: { displayName: string; primaryColor: string; accentColor: string }) {
  return request<BrandSettings>("/api/settings/branding", { method: "PATCH", body: input })
}

export function resetBranding() {
  return request<BrandSettings>("/api/settings/branding/reset", { method: "POST" })
}

export function removeLogo() {
  return request<BrandSettings>("/api/settings/branding/logo", { method: "DELETE" })
}

export async function uploadLogo(file: File): Promise<BrandSettings> {
  const form = new FormData()
  form.append("logo", file)
  const token = getAccessToken()
  const res = await fetch(`${API_URL}/api/settings/branding/logo`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed with ${res.status}`)
  return data as BrandSettings
}

export interface Product {
  id: string
  name: string
  category: string | null
  sku: string | null
  unitLabel: string
  costPrice: number
  wholesalePrice: number
  retailPrice: number
  stockQty: number
  reorderLevel: number
  createdAt: string
  updatedAt: string
}

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

export interface ListProductsResult {
  products: Product[]
  total: number
  page: number
  pageSize: number
}

export function listProducts(params: {
  search?: string
  category?: string
  lowStockOnly?: boolean
  page: number
  pageSize: number
}) {
  const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) })
  if (params.search) qs.set("search", params.search)
  if (params.category) qs.set("category", params.category)
  if (params.lowStockOnly) qs.set("lowStockOnly", "true")
  return request<ListProductsResult>(`/api/products?${qs}`)
}

export function getProductCategories() {
  return request<string[]>("/api/products/categories")
}

export function getProduct(id: string) {
  return request<Product>(`/api/products/${id}`)
}

export function createProduct(input: ProductInput) {
  return request<Product>("/api/products", { body: input })
}

export function updateProduct(id: string, input: ProductInput) {
  return request<Product>(`/api/products/${id}`, { method: "PATCH", body: input })
}

export interface StockHistoryEntry {
  id: string
  change: number
  reason: "SALE" | "RESTOCK" | "ADJUSTMENT" | "RETURN"
  performedBy: string
  createdAt: string
  balanceAfter: number
}

export function getStockHistory(productId: string) {
  return request<StockHistoryEntry[]>(`/api/products/${productId}/stock-history`)
}

export type SaleStatus = "PENDING" | "PARTIALLY_PAID" | "PAID" | "CANCELLED"
export type PriceType = "WHOLESALE" | "RETAIL"
export type PaymentMethod = "CASH" | "TRANSFER" | "POS" | "OTHER"

export interface SaleListItem {
  id: string
  receiptNumber: string
  customerName: string
  createdAt: string
  totalAmount: number
  amountPaid: number
  balance: number
  status: SaleStatus
  recordedByName: string
}

export interface ListSalesResult {
  sales: SaleListItem[]
  total: number
  page: number
  pageSize: number
}

export function listSales(params: {
  search?: string
  status?: SaleStatus
  dateFrom?: string
  dateTo?: string
  page: number
  pageSize: number
}) {
  const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) })
  if (params.search) qs.set("search", params.search)
  if (params.status) qs.set("status", params.status)
  if (params.dateFrom) qs.set("dateFrom", params.dateFrom)
  if (params.dateTo) qs.set("dateTo", params.dateTo)
  return request<ListSalesResult>(`/api/sales?${qs}`)
}

export interface SaleItemDetail {
  id: string
  productId: string
  quantity: number
  unitPriceAtSale: number
  costAtSale: number
  priceType: PriceType
  Product: { id: string; name: string; unitLabel: string }
}

export interface PaymentDetail {
  id: string
  amount: number
  method: PaymentMethod
  createdAt: string
  ReceivedBy: { id: string; name: string }
}

export interface SaleDetail {
  id: string
  receiptNumber: string
  status: SaleStatus
  totalAmount: number
  createdAt: string
  latestReceiptUrl: string | null
  Customer: { id: string; name: string; phone: string | null } | null
  RecordedBy: { id: string; name: string }
  SaleItems: SaleItemDetail[]
  Payments: PaymentDetail[]
}

export function getSale(id: string) {
  return request<SaleDetail>(`/api/sales/${id}`)
}

export interface CreateSaleInput {
  customerId?: string | null
  items: { productId: string; quantity: number; priceType: PriceType }[]
  initialPayment?: { amount: number; method: PaymentMethod } | null
}

export function createSale(input: CreateSaleInput) {
  return request<SaleDetail>("/api/sales", { body: input })
}

export function recordPayment(saleId: string, input: { amount: number; method: PaymentMethod }) {
  return request<SaleDetail>(`/api/sales/${saleId}/payments`, { body: input })
}

export interface CustomerListItem {
  id: string
  name: string
  phone: string | null
  totalSpent: number
  balanceOwed: number
  lastPurchaseDate: string | null
}

export interface ListCustomersResult {
  customers: CustomerListItem[]
  total: number
  page: number
  pageSize: number
}

export function listCustomers(params: {
  search?: string
  owesMoneyOnly?: boolean
  page: number
  pageSize: number
}) {
  const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) })
  if (params.search) qs.set("search", params.search)
  if (params.owesMoneyOnly) qs.set("owesMoneyOnly", "true")
  return request<ListCustomersResult>(`/api/customers?${qs}`)
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  notes: string | null
}

export interface CustomerHistoryEntry {
  id: string
  receiptNumber: string
  createdAt: string
  totalAmount: number
  balance: number
  status: SaleStatus
}

export interface CustomerDetail {
  customer: Customer
  history: CustomerHistoryEntry[]
  summary: { totalSpent: number; balanceOwed: number; orderCount: number }
}

export function getCustomer(id: string) {
  return request<CustomerDetail>(`/api/customers/${id}`)
}

export interface CustomerInput {
  name: string
  phone?: string | null
  notes?: string | null
}

export function createCustomer(input: CustomerInput) {
  return request<Customer>("/api/customers", { body: input })
}

export function updateCustomer(id: string, input: CustomerInput) {
  return request<Customer>(`/api/customers/${id}`, { method: "PATCH", body: input })
}

export interface Supplier {
  id: string
  name: string
  phone: string | null
  notes: string | null
}

export interface ListSuppliersResult {
  suppliers: Supplier[]
  total: number
  page: number
  pageSize: number
}

export function listSuppliers(params: { search?: string; page: number; pageSize: number }) {
  const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) })
  if (params.search) qs.set("search", params.search)
  return request<ListSuppliersResult>(`/api/suppliers?${qs}`)
}

export interface SupplierInput {
  name: string
  phone?: string | null
  notes?: string | null
}

export function createSupplier(input: SupplierInput) {
  return request<Supplier>("/api/suppliers", { body: input })
}

export function updateSupplier(id: string, input: SupplierInput) {
  return request<Supplier>(`/api/suppliers/${id}`, { method: "PATCH", body: input })
}

export interface GoodsReceivedInput {
  supplierId: string
  items: { productId: string; quantity: number; costPrice?: number | null }[]
}

export function recordGoodsReceived(input: GoodsReceivedInput) {
  return request<{ supplierId: string; itemCount: number; totalUnits: number }>("/api/goods-received", {
    body: input,
  })
}

export type AutomationTrigger = "LOW_STOCK" | "DEBT_OVERDUE" | "SCHEDULE"
export type NotificationChannel = "EMAIL" | "WHATSAPP"

export interface AutomationConfig {
  channel: NotificationChannel
  daysOverdue?: number
  sendTime?: string
}

export interface AutomationRule {
  trigger: AutomationTrigger
  enabled: boolean
  config: AutomationConfig
}

export function getAutomationRules() {
  return request<AutomationRule[]>("/api/settings/automations")
}

export function updateAutomationRule(
  trigger: AutomationTrigger,
  input: { enabled: boolean; config: AutomationConfig }
) {
  return request<AutomationRule>(`/api/settings/automations/${trigger}`, { method: "PUT", body: input })
}

export interface ReportsResponse {
  range: { from: string; to: string }
  salesOverTime: {
    granularity: "day" | "week"
    points: { bucket: string; revenue: number }[]
  }
  topProducts: {
    byRevenue: { productId: string; name: string; units: number; revenue: number }[]
    byUnits: { productId: string; name: string; units: number; revenue: number }[]
  }
  profit: { revenue: number; cost: number; profit: number }
  outstandingDebts: {
    totalOwed: number
    topDebtors: { customerId: string; name: string; balance: number }[]
  }
  paymentBreakdown: { method: "CASH" | "TRANSFER" | "POS" | "OTHER"; total: number }[]
  inventoryHealth: { lowStockCount: number; totalStockValue: number }
}

export function getReports(from?: string, to?: string) {
  const qs = new URLSearchParams()
  if (from) qs.set("from", from)
  if (to) qs.set("to", to)
  const query = qs.toString()
  return request<ReportsResponse>(`/api/reports${query ? `?${query}` : ""}`)
}

// --- Team ---

export interface TeamMember {
  id: string
  kind: "MEMBER" | "INVITE"
  name: string | null
  email: string
  role: MembershipRole
  status: "ACTIVE" | "INVITED"
  joinedAt: string
}

export function getTeam() {
  return request<TeamMember[]>("/api/team")
}

export function inviteMember(email: string) {
  return request<{ token: string; invite: TeamMember }>("/api/invites", { body: { email } })
}

export function updateMemberRole(membershipId: string, role: MembershipRole) {
  return request(`/api/team/members/${membershipId}`, { method: "PATCH", body: { role } })
}

export function removeMember(membershipId: string) {
  return request(`/api/team/members/${membershipId}`, { method: "DELETE" })
}

export function revokeInvite(inviteId: string) {
  return request(`/api/team/invites/${inviteId}`, { method: "DELETE" })
}

// --- Account ---

export function updateProfile(name: string) {
  return request<SessionUser>("/api/account/profile", { method: "PATCH", body: { name } })
}

export function updateEmail(email: string, currentPassword: string) {
  return request<SessionUser>("/api/account/email", { method: "PATCH", body: { email, currentPassword } })
}

export function updateAccountPassword(currentPassword: string, newPassword: string) {
  return request<void>("/api/account/password", { method: "PATCH", body: { currentPassword, newPassword } })
}

// --- Activity log ---

export interface ActivityLogEntry {
  id: string
  createdAt: string
  actorName: string
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown>
}

export function getActivityLogs(params: {
  actorUserId?: string
  action?: string
  from?: string
  to?: string
  page?: number
}) {
  const qs = new URLSearchParams()
  if (params.actorUserId) qs.set("actorUserId", params.actorUserId)
  if (params.action) qs.set("action", params.action)
  if (params.from) qs.set("from", params.from)
  if (params.to) qs.set("to", params.to)
  if (params.page) qs.set("page", String(params.page))
  return request<{ logs: ActivityLogEntry[]; total: number }>(`/api/activity-logs?${qs.toString()}`)
}

export function getActivityLogActions() {
  return request<string[]>("/api/activity-logs/actions")
}

// --- Billing ---

export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED"

export interface BillingPlan {
  id: string
  name: string
  priceKobo: number
  limits: { maxProducts?: number; maxStaff?: number }
}

export interface BillingOverview {
  subscription: {
    status: SubscriptionStatus
    currentPeriodEnd: string | null
    plan: BillingPlan | null
  }
  usage: {
    products: { used: number; limit: number | null }
    staff: { used: number; limit: number | null }
  }
  plans: BillingPlan[]
}

export function getBilling() {
  return request<BillingOverview>("/api/billing")
}

export function startCheckout(planId: string) {
  return request<{ authorizationUrl: string; reference: string }>("/api/billing/checkout", {
    body: { planId },
  })
}

export function downgradePlan(planId: string) {
  return request("/api/billing/downgrade", { body: { planId } })
}
