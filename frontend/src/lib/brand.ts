/**
 * Colours already live as CSS variables on :root (index.css) — once Phase 2
 * wires up the real BrandSettings fetch, applying a tenant's theme is just
 * document.documentElement.style.setProperty("--primary", org.primaryColor).
 * Until then (and for logos — no upload until Phase 2), initials carry an
 * org's or user's identity, same fallback pattern everywhere.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}
