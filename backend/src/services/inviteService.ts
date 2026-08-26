import { Organization, User, Membership, Invite } from "../db/models"
import { withOrgTransaction } from "../db/withOrgTransaction"
import { hashPassword } from "../auth/password"
import { signInviteToken, verifyInviteToken } from "../auth/tokens"
import { assertCanInviteStaff } from "./entitlements"
import { logActivity } from "./activityLog"
import { AuthError } from "./authService"
import type { Session } from "./authService"
import { signAccessToken, signRefreshToken } from "../auth/tokens"
import { HttpError } from "../errors"

const INVITE_TTL_DAYS = 7

export async function createInvite(input: {
  organizationId: string
  invitedByUserId: string
  email: string
}) {
  const organization = await Organization.findByPk(input.organizationId)
  if (!organization) {
    throw new AuthError("Organization not found", 404)
  }

  await assertCanInviteStaff(input.organizationId)

  const email = input.email.toLowerCase()

  const existingUser = await User.findOne({ where: { email } })
  if (existingUser) {
    const existingMembership = await withOrgTransaction(input.organizationId, (t) =>
      Membership.findOne({ where: { organizationId: input.organizationId, userId: existingUser.id }, transaction: t })
    )
    if (existingMembership) {
      throw new HttpError("This person is already a member of your team", 409)
    }
  }

  const invite = await withOrgTransaction(input.organizationId, async (t) => {
    const existingPending = await Invite.findOne({
      where: { organizationId: input.organizationId, email, status: "PENDING" },
      transaction: t,
    })
    if (existingPending) {
      throw new HttpError("An invite is already pending for this email", 409)
    }

    return Invite.create(
      {
        organizationId: input.organizationId,
        email,
        role: "STAFF",
        invitedByUserId: input.invitedByUserId,
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
      { transaction: t }
    )
  })

  const token = signInviteToken({ inviteId: invite.id, orgId: organization.id, email, role: "STAFF" })
  return { token, invite }
}

async function findValidInvite(token: string) {
  let payload
  try {
    payload = verifyInviteToken(token)
  } catch {
    throw new AuthError("This invite link is invalid or has expired", 400)
  }

  const invite = await withOrgTransaction(payload.orgId, (t) =>
    Invite.findOne({ where: { id: payload.inviteId, organizationId: payload.orgId }, transaction: t })
  )
  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    throw new AuthError("This invite link is invalid or has expired", 400)
  }

  return { payload, invite }
}

export async function getInviteDetails(token: string) {
  const { payload, invite } = await findValidInvite(token)

  const organization = await Organization.findByPk(invite.organizationId)
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
  const { invite } = await findValidInvite(input.token)

  const organization = await Organization.findByPk(invite.organizationId)
  if (!organization) {
    throw new AuthError("This invite link is invalid or has expired", 400)
  }

  const existing = await User.findOne({ where: { email: invite.email } })
  if (existing) {
    throw new AuthError("An account with this email already exists — log in instead", 409)
  }

  const passwordHash = await hashPassword(input.password)

  const { user, membership } = await withOrgTransaction(organization.id, async (t) => {
    const user = await User.create(
      { email: invite.email, passwordHash, name: input.name },
      { transaction: t }
    )
    const membership = await Membership.create(
      { organizationId: organization.id, userId: user.id, role: invite.role },
      { transaction: t }
    )
    invite.status = "ACCEPTED"
    await invite.save({ transaction: t })
    await logActivity(t, {
      organizationId: organization.id,
      actorUserId: user.id,
      action: "MEMBER_JOINED",
      entityType: "Membership",
      entityId: membership.id,
      metadata: { name: user.name, email: user.email, role: membership.role },
    })
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

export interface TeamMember {
  id: string
  kind: "MEMBER" | "INVITE"
  name: string | null
  email: string
  role: "OWNER" | "STAFF"
  status: "ACTIVE" | "INVITED"
  joinedAt: string
}

export async function listTeam(organizationId: string): Promise<TeamMember[]> {
  const [memberships, invites] = await withOrgTransaction(organizationId, (t) =>
    Promise.all([
      Membership.findAll({ where: { organizationId }, include: [{ model: User }], transaction: t }),
      Invite.findAll({ where: { organizationId, status: "PENDING" }, transaction: t }),
    ])
  )

  const members: TeamMember[] = memberships.map((m) => ({
    id: m.id,
    kind: "MEMBER",
    name: m.User!.name,
    email: m.User!.email,
    role: m.role,
    status: "ACTIVE",
    joinedAt: m.createdAt.toISOString(),
  }))

  const pending: TeamMember[] = invites.map((i) => ({
    id: i.id,
    kind: "INVITE",
    name: null,
    email: i.email,
    role: i.role,
    status: "INVITED",
    joinedAt: i.createdAt.toISOString(),
  }))

  return [...members, ...pending].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
}

export async function updateMemberRole(
  organizationId: string,
  membershipId: string,
  role: "OWNER" | "STAFF",
  actingUserId: string
) {
  return withOrgTransaction(organizationId, async (t) => {
    const membership = await Membership.findOne({
      where: { id: membershipId, organizationId },
      transaction: t,
    })
    if (!membership) throw new HttpError("Member not found", 404)

    if (membership.role === "OWNER" && role === "STAFF") {
      const ownerCount = await Membership.count({ where: { organizationId, role: "OWNER" }, transaction: t })
      if (ownerCount <= 1) {
        throw new HttpError("Every business needs at least one owner", 400)
      }
    }

    membership.role = role
    await membership.save({ transaction: t })

    await logActivity(t, {
      organizationId,
      actorUserId: actingUserId,
      action: "MEMBER_ROLE_CHANGED",
      entityType: "Membership",
      entityId: membership.id,
      metadata: { role },
    })

    return membership
  })
}

export async function removeMember(organizationId: string, membershipId: string, actingUserId: string) {
  return withOrgTransaction(organizationId, async (t) => {
    const membership = await Membership.findOne({
      where: { id: membershipId, organizationId },
      include: [{ model: User }],
      transaction: t,
    })
    if (!membership) throw new HttpError("Member not found", 404)

    if (membership.userId === actingUserId) {
      throw new HttpError("You can't remove yourself", 400)
    }

    if (membership.role === "OWNER") {
      const ownerCount = await Membership.count({ where: { organizationId, role: "OWNER" }, transaction: t })
      if (ownerCount <= 1) {
        throw new HttpError("Every business needs at least one owner", 400)
      }
    }

    const removedName = membership.User!.name
    await membership.destroy({ transaction: t })

    await logActivity(t, {
      organizationId,
      actorUserId: actingUserId,
      action: "MEMBER_REMOVED",
      entityType: "Membership",
      entityId: membershipId,
      metadata: { name: removedName },
    })
  })
}

export async function revokeInvite(organizationId: string, inviteId: string, actingUserId: string) {
  return withOrgTransaction(organizationId, async (t) => {
    const invite = await Invite.findOne({ where: { id: inviteId, organizationId }, transaction: t })
    if (!invite || invite.status !== "PENDING") {
      throw new HttpError("Invite not found", 404)
    }

    invite.status = "REVOKED"
    await invite.save({ transaction: t })

    await logActivity(t, {
      organizationId,
      actorUserId: actingUserId,
      action: "INVITE_REVOKED",
      entityType: "Invite",
      entityId: invite.id,
      metadata: { email: invite.email },
    })
  })
}
