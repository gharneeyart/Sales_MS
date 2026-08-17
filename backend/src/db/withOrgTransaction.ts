import type { Transaction } from "sequelize"

import { sequelize } from "./sequelize"

interface RlsContext {
  organizationId?: string
  userId?: string
}

/**
 * Sets the RLS session context for the given transaction (A.10).
 * `set_config(..., true)` — not `SET LOCAL` — because `SET` doesn't accept
 * bound parameters over the wire; `set_config` does, and `is_local = true`
 * scopes it to the transaction so it resets automatically and never leaks
 * to the next request sharing this pooled connection.
 *
 * Exported standalone (not just via `withRlsContext` below) for flows like
 * signup, where the organization doesn't exist yet when the transaction
 * opens — the context has to be set *mid*-transaction, right after the org
 * row is created, and before the membership/subscription inserts that
 * depend on it passing their RLS `WITH CHECK`.
 */
export async function setRlsContext(t: Transaction, context: RlsContext): Promise<void> {
  if (context.organizationId) {
    await sequelize.query("SELECT set_config('app.current_org_id', :orgId, true)", {
      replacements: { orgId: context.organizationId },
      transaction: t,
    })
  }
  if (context.userId) {
    await sequelize.query("SELECT set_config('app.current_user_id', :userId, true)", {
      replacements: { userId: context.userId },
      transaction: t,
    })
  }
}

/** Opens a transaction with the RLS context set up front, for the common case. */
export async function withRlsContext<T>(
  context: RlsContext,
  fn: (t: Transaction) => Promise<T>
): Promise<T> {
  return sequelize.transaction(async (t) => {
    await setRlsContext(t, context)
    return fn(t)
  })
}

/** Convenience wrapper for the common case of a single tenant-scoped request. */
export function withOrgTransaction<T>(
  organizationId: string,
  fn: (t: Transaction) => Promise<T>
): Promise<T> {
  return withRlsContext({ organizationId }, fn)
}
