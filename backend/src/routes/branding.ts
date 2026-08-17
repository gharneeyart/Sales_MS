import { Router } from "express"
import multer from "multer"
import { z } from "zod"

import { authenticate } from "../middleware/authenticate"
import { requireRole } from "../middleware/requireRole"
import { validateBody } from "../middleware/validate"
import { AuthError } from "../services/authService"
import {
  MAX_LOGO_BYTES,
  getOrCreateBrandSettings,
  removeLogo,
  resetBrandSettings,
  updateBrandSettings,
  uploadLogo,
} from "../services/brandingService"
import { Organization } from "../db/models"

export const brandingRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LOGO_BYTES },
})

function serialize(settings: {
  displayName: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  accentColor: string
}) {
  return {
    displayName: settings.displayName,
    logoUrl: settings.logoUrl,
    primaryColor: settings.primaryColor,
    secondaryColor: settings.secondaryColor,
    accentColor: settings.accentColor,
  }
}

async function fallbackDisplayName(organizationId: string): Promise<string> {
  const organization = await Organization.findByPk(organizationId)
  return organization?.name ?? "My Business"
}

brandingRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const orgId = req.auth!.orgId
    const settings = await getOrCreateBrandSettings(orgId, await fallbackDisplayName(orgId))
    res.json(serialize(settings))
  } catch (error) {
    next(error)
  }
})

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Enter a valid hex color, e.g. #2563EB")

const updateSchema = z.object({
  displayName: z.string().trim().min(1, "Business name is required"),
  primaryColor: hexColor,
  accentColor: hexColor,
})

brandingRouter.patch(
  "/",
  authenticate,
  requireRole("OWNER"),
  validateBody(updateSchema),
  async (req, res, next) => {
    try {
      const settings = await updateBrandSettings(req.auth!.orgId, req.body)
      res.json(serialize(settings))
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ error: error.message })
        return
      }
      next(error)
    }
  }
)

brandingRouter.post("/reset", authenticate, requireRole("OWNER"), async (req, res, next) => {
  try {
    const orgId = req.auth!.orgId
    const settings = await resetBrandSettings(orgId, await fallbackDisplayName(orgId))
    res.json(serialize(settings))
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})

brandingRouter.post(
  "/logo",
  authenticate,
  requireRole("OWNER"),
  (req, res, next) => {
    upload.single("logo")(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        res.status(400).json({ error: "Logo must be 2MB or smaller" })
        return
      }
      next(error)
    })
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No logo file was uploaded" })
        return
      }
      const settings = await uploadLogo(req.auth!.orgId, req.file)
      res.json(serialize(settings))
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ error: error.message })
        return
      }
      next(error)
    }
  }
)

brandingRouter.delete("/logo", authenticate, requireRole("OWNER"), async (req, res, next) => {
  try {
    const settings = await removeLogo(req.auth!.orgId)
    res.json(serialize(settings))
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})
