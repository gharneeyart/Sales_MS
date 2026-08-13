/**
 * Placeholder for BrandSettings (A.6) until Phase 2 wires up the real
 * per-org fetch. Colours already live as CSS variables on :root (index.css)
 * so a future BrandSettings load just needs to call
 * document.documentElement.style.setProperty("--primary", org.primaryColor).
 */
export interface Brand {
  displayName: string
  logoUrl?: string
}

export const brand: Brand = {
  displayName: "Acme Traders",
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}
