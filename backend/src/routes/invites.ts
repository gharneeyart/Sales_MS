import { Router } from "express"
import { z } from "zod"

import { validateBody } from "../middleware/validate"
import { authenticate } from "../middleware/authenticate"
import { requireRole } from "../middleware/requireRole"
import { setRefreshCookie } from "../auth/refreshCookie"
import { AuthError } from "../services/authService"
import { createInvite, getInviteDetails, acceptInvite } from "../services/inviteService"

export const invitesRouter = Router()

const createInviteSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
})

// Owner-only. Email delivery (A.8's notifications queue) lands in Phase 6 —
// for now the caller shares the returned token/link with the invitee
// themselves.
invitesRouter.post(
  "/",
  authenticate,
  requireRole("OWNER"),
  validateBody(createInviteSchema),
  async (req, res, next) => {
    try {
      const invite = await createInvite({
        organizationId: req.auth!.orgId,
        email: req.body.email,
      })
      res.status(201).json(invite)
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ error: error.message })
        return
      }
      next(error)
    }
  }
)

invitesRouter.get("/:token", async (req, res, next) => {
  try {
    const details = await getInviteDetails(req.params.token as string)
    res.json(details)
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

const acceptInviteSchema = z.object({
  name: z.string().trim().min(1, "Your name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

invitesRouter.post("/:token/accept", validateBody(acceptInviteSchema), async (req, res, next) => {
  try {
    const session = await acceptInvite({
      token: req.params.token as string,
      name: req.body.name,
      password: req.body.password,
    })
    setRefreshCookie(res, session.refreshToken)
    const { refreshToken: _refreshToken, ...publicSession } = session
    res.status(201).json(publicSession)
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})
