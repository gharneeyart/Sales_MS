import { Router } from "express"
import { z } from "zod"

import { authenticate } from "../middleware/authenticate"
import { requireRole } from "../middleware/requireRole"
import { validateBody } from "../middleware/validate"
import { HttpError } from "../errors"
import { listTeam, updateMemberRole, removeMember, revokeInvite } from "../services/inviteService"

export const teamRouter = Router()
teamRouter.use(authenticate)

teamRouter.get("/", async (req, res, next) => {
  try {
    res.json(await listTeam(req.auth!.orgId))
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

const updateRoleSchema = z.object({
  role: z.enum(["OWNER", "STAFF"]),
})

teamRouter.patch(
  "/members/:id",
  requireRole("OWNER"),
  validateBody(updateRoleSchema),
  async (req, res, next) => {
    try {
      const membership = await updateMemberRole(
        req.auth!.orgId,
        req.params.id as string,
        req.body.role,
        req.auth!.sub
      )
      res.json(membership)
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.statusCode).json({ error: error.message })
        return
      }
      next(error)
    }
  }
)

teamRouter.delete("/members/:id", requireRole("OWNER"), async (req, res, next) => {
  try {
    await removeMember(req.auth!.orgId, req.params.id as string, req.auth!.sub)
    res.status(204).end()
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

teamRouter.delete("/invites/:id", requireRole("OWNER"), async (req, res, next) => {
  try {
    await revokeInvite(req.auth!.orgId, req.params.id as string, req.auth!.sub)
    res.status(204).end()
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})
