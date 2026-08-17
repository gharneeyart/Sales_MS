import { Organization, User, Membership } from "../db/models"
import { withOrgTransaction } from "../db/withOrgTransaction"
import { hashPassword } from "../auth/password"
import { signInviteToken, verifyInviteToken } from "../auth/tokens"
import { AuthError } from "./authService"
import type { Session } from "./authService"
import { signAccessToken, signRefreshToken } from "../auth/tokens"

export async function createInvite(input: { organizationId: string; email: string }) {
  const organization = await Organization.findByPk(input.organizationId)
  if (!organization) {
    throw new AuthError("Organization not found", 404)
  }

  const token = signInviteToken({ orgId: organization.id, email: input.email, role: "STAFF" })
  return { token }
}

export async function getInviteDetails(token: string) {
  let payload
  try {
    payload = verifyInviteToken(token)
  } catch {
    throw new AuthError("This invite link is invalid or has expired", 400)
  }

  const organization = await Organization.findByPk(payload.orgId)
  if (!organization) {
    throw new AuthError("This invite link is invalid or has expired", 400)
  }

  return {
    organizationName: organization.name,
    email: payload.email,
    role: payload.role,
  }
}

export async function acceptInvite(input: {
  token: string
  name: string
  password: string
}): Promise<Session> {
  let payload
  try {
    payload = verifyInviteToken(input.token)
  } catch {
    throw new AuthError("This invite link is invalid or has expired", 400)
  }

  const organization = await Organization.findByPk(payload.orgId)
  if (!organization) {
    throw new AuthError("This invite link is invalid or has expired", 400)
  }

  const existing = await User.findOne({ where: { email: payload.email } })
  if (existing) {
    throw new AuthError("An account with this email already exists — log in instead", 409)
  }

  const passwordHash = await hashPassword(input.password)

  const { user, membership } = await withOrgTransaction(organization.id, async (t) => {
    const user = await User.create(
      { email: payload.email, passwordHash, name: input.name },
      { transaction: t }
    )
    const membership = await Membership.create(
      { organizationId: organization.id, userId: user.id, role: payload.role },
      { transaction: t }
    )
    return { user, membership }
  })

  return {
    accessToken: signAccessToken({ sub: user.id, orgId: organization.id, role: membership.role }),
    refreshToken: signRefreshToken({ sub: user.id, orgId: organization.id }),
    user: { id: user.id, name: user.name, email: user.email },
    organization: { id: organization.id, name: organization.name },
    role: membership.role,
  }
}
