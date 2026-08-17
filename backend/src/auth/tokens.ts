import jwt, { type SignOptions } from "jsonwebtoken"

import { env } from "../config/env"
import type { MembershipRole } from "../db/models/Membership"

export interface AccessTokenPayload {
  sub: string
  orgId: string
  role: MembershipRole
}

export interface RefreshTokenPayload {
  sub: string
  orgId: string
}

export interface InviteTokenPayload {
  orgId: string
  email: string
  role: Extract<MembershipRole, "STAFF">
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl as SignOptions["expiresIn"],
  })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: `${env.refreshTokenTtlDays}d` as SignOptions["expiresIn"],
  })
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload
}

// 7 days is enough for someone to check email and act on an invite without
// leaving a standing credential valid indefinitely.
const INVITE_TOKEN_TTL = "7d"

export function signInviteToken(payload: InviteTokenPayload): string {
  return jwt.sign(payload, env.jwtInviteSecret, { expiresIn: INVITE_TOKEN_TTL })
}

export function verifyInviteToken(token: string): InviteTokenPayload {
  return jwt.verify(token, env.jwtInviteSecret) as InviteTokenPayload
}
