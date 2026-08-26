import { Router } from "express"
import { z } from "zod"

import { authenticate } from "../middleware/authenticate"
import { validateBody } from "../middleware/validate"
import { HttpError } from "../errors"
import { updateProfile, updateEmail, updatePassword } from "../services/accountService"

export const accountRouter = Router()
accountRouter.use(authenticate)

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
})

accountRouter.patch("/profile", validateBody(profileSchema), async (req, res, next) => {
  try {
    res.json(await updateProfile(req.auth!.sub, req.body.name))
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

const emailSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  currentPassword: z.string().min(1, "Current password is required"),
})

accountRouter.patch("/email", validateBody(emailSchema), async (req, res, next) => {
  try {
    res.json(await updateEmail(req.auth!.sub, req.body))
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
})

accountRouter.patch("/password", validateBody(passwordSchema), async (req, res, next) => {
  try {
    await updatePassword(req.auth!.sub, req.body)
    res.status(204).end()
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})
