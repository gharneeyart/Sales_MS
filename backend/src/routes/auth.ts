import { Router } from "express"
import { z } from "zod"

import { validateBody } from "../middleware/validate"
import { authenticate } from "../middleware/authenticate"
import { setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE_NAME } from "../auth/refreshCookie"
import { AuthError, signup, login, refreshSession, type Session } from "../services/authService"
import { User, Organization, Membership } from "../db/models"
import { withOrgTransaction } from "../db/withOrgTransaction"

export const authRouter = Router()

// The refresh token only ever leaves the server as the httpOnly cookie
// (setRefreshCookie). Echoing it in the JSON body too would let an XSS
// payload read it straight off the fetch response, defeating the point of
// httpOnly in the first place.
function toPublicSession(session: Session) {
  const { refreshToken: _refreshToken, ...publicSession } = session
  return publicSession
}

const signupSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required"),
  name: z.string().trim().min(1, "Your name is required"),
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

authRouter.post("/signup", validateBody(signupSchema), async (req, res, next) => {
  try {
    const session = await signup(req.body)
    setRefreshCookie(res, session.refreshToken)
    res.status(201).json(toPublicSession(session))
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Password is required"),
})

authRouter.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const session = await login(req.body)
    setRefreshCookie(res, session.refreshToken)
    res.json(toPublicSession(session))
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

authRouter.post("/refresh", async (req, res, next) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME]
  if (!token) {
    res.status(401).json({ error: "No session" })
    return
  }

  try {
    const session = await refreshSession(token)
    setRefreshCookie(res, session.refreshToken)
    res.json(toPublicSession(session))
  } catch (error) {
    if (error instanceof AuthError) {
      clearRefreshCookie(res)
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

authRouter.post("/logout", (_req, res) => {
  clearRefreshCookie(res)
  res.status(204).end()
})

authRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    const auth = req.auth!
    const [user, organization, membership] = await Promise.all([
      User.findByPk(auth.sub),
      Organization.findByPk(auth.orgId),
      withOrgTransaction(auth.orgId, (t) =>
        Membership.findOne({
          where: { userId: auth.sub, organizationId: auth.orgId },
          transaction: t,
        })
      ),
    ])

    if (!user || !organization || !membership) {
      res.status(401).json({ error: "Invalid session" })
      return
    }

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      organization: { id: organization.id, name: organization.name },
      role: membership.role,
    })
  } catch (error) {
    next(error)
  }
})
