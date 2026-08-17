import { sequelize } from "../db/sequelize"
import { Organization, User, Membership, Plan, Subscription, BrandSettings } from "../db/models"
import type { MembershipRole } from "../db/models/Membership"
import { withRlsContext, setRlsContext } from "../db/withOrgTransaction"
import { hashPassword, verifyPassword } from "../auth/password"
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../auth/tokens"

export class AuthError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 401) {
    super(message)
    this.statusCode = statusCode
  }
}

export interface Session {
  accessToken: string
  refreshToken: string
  user: { id: string; name: string; email: string }
  organization: { id: string; name: string }
  role: MembershipRole
}

function issueTokens(userId: string, organizationId: string, role: MembershipRole) {
  return {
    accessToken: signAccessToken({ sub: userId, orgId: organizationId, role }),
    refreshToken: signRefreshToken({ sub: userId, orgId: organizationId }),
  }
}

export async function signup(input: {
  businessName: string
  name: string
  email: string
  password: string
}): Promise<Session> {
  const existing = await User.findOne({ where: { email: input.email } })
  if (existing) {
    throw new AuthError("An account with this email already exists", 409)
  }

  const passwordHash = await hashPassword(input.password)

  // A.9's transactional skeleton, specialised for signup: the org doesn't
  // exist yet when the transaction opens, so the RLS context is set
  // mid-transaction, right after the org row lands and before the
  // membership/subscription inserts that need it.
  const { organization, user, role } = await sequelize.transaction(async (t) => {
    const organization = await Organization.create({ name: input.businessName }, { transaction: t })
    await setRlsContext(t, { organizationId: organization.id })

    const user = await User.create(
      { email: input.email, passwordHash, name: input.name },
      { transaction: t }
    )
    await Membership.create(
      { organizationId: organization.id, userId: user.id, role: "OWNER" },
      { transaction: t }
    )

    const freePlan = await Plan.findOne({ where: { name: "Free" }, transaction: t })
    if (!freePlan) {
      throw new Error("Free plan is not seeded — run `npm run db:seed`")
    }
    await Subscription.create(
      { organizationId: organization.id, planId: freePlan.id, status: "TRIALING" },
      { transaction: t }
    )

    // A.6 — every org starts with the default theme, so nothing is ever
    // unstyled while the owner hasn't visited Settings yet.
    await BrandSettings.create(
      { organizationId: organization.id, displayName: organization.name },
      { transaction: t }
    )

    return { organization, user, role: "OWNER" as const }
  })

  const tokens = issueTokens(user.id, organization.id, role)
  return {
    ...tokens,
    user: { id: user.id, name: user.name, email: user.email },
    organization: { id: organization.id, name: organization.name },
    role,
  }
}

export async function login(input: { email: string; password: string }): Promise<Session> {
  const user = await User.findOne({ where: { email: input.email } })
  if (!user) {
    throw new AuthError("Invalid email or password")
  }

  const validPassword = await verifyPassword(input.password, user.passwordHash)
  if (!validPassword) {
    throw new AuthError("Invalid email or password")
  }

  // A user belongs to possibly many orgs; Phase 1 doesn't have an org
  // switcher yet, so we resolve the earliest membership as the active one.
  // RLS only lets this read through via the self-read policy — see
  // migrations/20260101000006-enable-rls.js.
  const membership = await withRlsContext({ userId: user.id }, (t) =>
    Membership.findOne({
      where: { userId: user.id },
      order: [["createdAt", "ASC"]],
      include: [Organization],
      transaction: t,
    })
  )

  if (!membership) {
    throw new AuthError("This account isn't linked to a business yet")
  }

  const organization = await Organization.findByPk(membership.organizationId)
  if (!organization) {
    throw new AuthError("This account isn't linked to a business yet")
  }

  const tokens = issueTokens(user.id, organization.id, membership.role)
  return {
    ...tokens,
    user: { id: user.id, name: user.name, email: user.email },
    organization: { id: organization.id, name: organization.name },
    role: membership.role,
  }
}

export async function refreshSession(refreshToken: string): Promise<Session> {
  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    throw new AuthError("Invalid or expired session")
  }

  const user = await User.findByPk(payload.sub)
  const organization = await Organization.findByPk(payload.orgId)
  if (!user || !organization) {
    throw new AuthError("Invalid or expired session")
  }

  const membership = await withRlsContext({ organizationId: organization.id }, (t) =>
    Membership.findOne({ where: { organizationId: organization.id, userId: user.id }, transaction: t })
  )
  if (!membership) {
    throw new AuthError("Invalid or expired session")
  }

  const tokens = issueTokens(user.id, organization.id, membership.role)
  return {
    ...tokens,
    user: { id: user.id, name: user.name, email: user.email },
    organization: { id: organization.id, name: organization.name },
    role: membership.role,
  }
}
