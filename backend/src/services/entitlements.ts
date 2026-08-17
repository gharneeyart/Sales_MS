export interface Entitlements {
  plan: "free"
  allowAll: true
}

// Stub for Phase 1 — every org is treated as "free, allow all" until
// Phase 8 wires real plan limits + Paystack/Flutterwave billing.
export async function getEntitlements(_organizationId: string): Promise<Entitlements> {
  return { plan: "free", allowAll: true }
}
