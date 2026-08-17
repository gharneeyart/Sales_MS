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
