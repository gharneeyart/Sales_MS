import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { sequelize } from "../src/db/sequelize"
import { Organization, User, Membership } from "../src/db/models"
import { withOrgTransaction, withRlsContext } from "../src/db/withOrgTransaction"

// Proves the isolation guarantee A.3 and the Phase 1 roadmap call for
// directly: two orgs cannot see each other's rows, enforced by Postgres
// itself (not just an app-level query filter that a future bug could
// forget). Run in CI on a throwaway Postgres so it never touches real data.
describe("RLS tenant isolation", () => {
  let orgA: Organization
  let orgB: Organization
  let userA: User
  let userB: User

  beforeAll(async () => {
    await sequelize.authenticate()

    orgA = await Organization.create({ name: "RLS Test Org A" })
    orgB = await Organization.create({ name: "RLS Test Org B" })
    userA = await User.create({
      email: `rls-a-${Date.now()}@test.local`,
      passwordHash: "unused",
      name: "Org A Owner",
    })
    userB = await User.create({
      email: `rls-b-${Date.now()}@test.local`,
      passwordHash: "unused",
      name: "Org B Owner",
    })

    await withOrgTransaction(orgA.id, (t) =>
      Membership.create({ organizationId: orgA.id, userId: userA.id, role: "OWNER" }, { transaction: t })
    )
    await withOrgTransaction(orgB.id, (t) =>
      Membership.create({ organizationId: orgB.id, userId: userB.id, role: "OWNER" }, { transaction: t })
    )
  })

  afterAll(async () => {
    await withOrgTransaction(orgA.id, (t) =>
      Membership.destroy({ where: { organizationId: orgA.id }, transaction: t })
    )
    await withOrgTransaction(orgB.id, (t) =>
      Membership.destroy({ where: { organizationId: orgB.id }, transaction: t })
    )
    await User.destroy({ where: { id: [userA.id, userB.id] } })
    await Organization.destroy({ where: { id: [orgA.id, orgB.id] } })
    await sequelize.close()
  })

  it("org A's context only sees org A's membership rows", async () => {
    const rows = await withOrgTransaction(orgA.id, (t) => Membership.findAll({ transaction: t }))
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.organizationId === orgA.id)).toBe(true)
  })

  it("org B's context only sees org B's membership rows", async () => {
    const rows = await withOrgTransaction(orgB.id, (t) => Membership.findAll({ transaction: t }))
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.organizationId === orgB.id)).toBe(true)
  })

  it("org A's context cannot read org B's row even when asked for directly", async () => {
    const rows = await withOrgTransaction(orgA.id, (t) =>
      Membership.findAll({ where: { organizationId: orgB.id }, transaction: t })
    )
    expect(rows).toHaveLength(0)
  })

  it("fails closed with no RLS context set at all", async () => {
    const rows = await sequelize.transaction((t) =>
      Membership.findAll({ where: { organizationId: [orgA.id, orgB.id] }, transaction: t })
    )
    expect(rows).toHaveLength(0)
  })

  it("a user can read their own membership row by identity, without org context", async () => {
    const rows = await withRlsContext({ userId: userA.id }, (t) =>
      Membership.findAll({ transaction: t })
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].organizationId).toBe(orgA.id)
  })

  it("a user's self-read cannot surface another user's membership row", async () => {
    const rows = await withRlsContext({ userId: userA.id }, (t) =>
      Membership.findAll({ where: { userId: userB.id }, transaction: t })
    )
    expect(rows).toHaveLength(0)
  })
})
