/**
 * Placeholder for the authenticated user until Phase 1 wires up real auth
 * (A.7) and this is replaced by a context fed from the access token.
 */
export interface SessionUser {
  name: string
  role: "OWNER" | "STAFF"
  avatarUrl?: string
}

export const currentUser: SessionUser = {
  name: "Ngozi Eze",
  role: "OWNER",
}
