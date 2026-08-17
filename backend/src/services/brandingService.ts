import { withOrgTransaction } from "../db/withOrgTransaction"
import {
  BrandSettings,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
} from "../db/models"
import { objectStorage } from "../storage/cloudinaryStorage"
import { AuthError } from "./authService"

// PNG/JPG/WebP only, SVG explicitly excluded — SVG can carry embedded
// scripts and is a real XSS vector (A.6). Checked against actual file
// bytes below, not the client-supplied Content-Type/filename, which either
// tool a hostile client can lie about.
const ALLOWED_LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
}

export const MAX_LOGO_BYTES = 2 * 1024 * 1024 // 2MB

export async function getOrCreateBrandSettings(
  organizationId: string,
  fallbackDisplayName: string
): Promise<BrandSettings> {
  return withOrgTransaction(organizationId, async (t) => {
    const [settings] = await BrandSettings.findOrCreate({
      where: { organizationId },
      defaults: { organizationId, displayName: fallbackDisplayName },
      transaction: t,
    })
    return settings
  })
}

export async function updateBrandSettings(
  organizationId: string,
  input: { displayName: string; primaryColor: string; accentColor: string }
): Promise<BrandSettings> {
  return withOrgTransaction(organizationId, async (t) => {
    const settings = await BrandSettings.findOne({ where: { organizationId }, transaction: t })
    if (!settings) {
      throw new AuthError("Brand settings not found", 404)
    }
    settings.displayName = input.displayName
    settings.primaryColor = input.primaryColor
    settings.accentColor = input.accentColor
    await settings.save({ transaction: t })
    return settings
  })
}

export async function resetBrandSettings(
  organizationId: string,
  fallbackDisplayName: string
): Promise<BrandSettings> {
  return withOrgTransaction(organizationId, async (t) => {
    const settings = await BrandSettings.findOne({ where: { organizationId }, transaction: t })
    if (!settings) {
      throw new AuthError("Brand settings not found", 404)
    }

    if (settings.logoStorageKey) {
      await objectStorage.delete(settings.logoStorageKey)
    }

    settings.displayName = fallbackDisplayName
    settings.primaryColor = DEFAULT_PRIMARY_COLOR
    settings.secondaryColor = DEFAULT_SECONDARY_COLOR
    settings.accentColor = DEFAULT_ACCENT_COLOR
    settings.logoUrl = null
    settings.logoStorageKey = null
    await settings.save({ transaction: t })
    return settings
  })
}

export async function uploadLogo(
  organizationId: string,
  file: { buffer: Buffer; size: number }
): Promise<BrandSettings> {
  if (file.size > MAX_LOGO_BYTES) {
    throw new AuthError("Logo must be 2MB or smaller", 400)
  }

  // file-type sniffs magic bytes — the only trustworthy way to know what a
  // file actually is, as opposed to what its Content-Type header claims.
  const { fileTypeFromBuffer } = await import("file-type")
  const detected = await fileTypeFromBuffer(file.buffer)
  if (!detected || !(detected.mime in ALLOWED_LOGO_TYPES)) {
    throw new AuthError("Logo must be a PNG, JPG, or WebP image", 400)
  }
  const extension = ALLOWED_LOGO_TYPES[detected.mime]

  return withOrgTransaction(organizationId, async (t) => {
    const settings = await BrandSettings.findOne({ where: { organizationId }, transaction: t })
    if (!settings) {
      throw new AuthError("Brand settings not found", 404)
    }

    const previousKey = settings.logoStorageKey
    const uploaded = await objectStorage.upload({
      buffer: file.buffer,
      contentType: detected.mime,
      extension,
      keyPrefix: `logos/${organizationId}`,
    })

    settings.logoUrl = uploaded.url
    settings.logoStorageKey = uploaded.key
    await settings.save({ transaction: t })

    if (previousKey) {
      await objectStorage.delete(previousKey)
    }

    return settings
  })
}

export async function removeLogo(organizationId: string): Promise<BrandSettings> {
  return withOrgTransaction(organizationId, async (t) => {
    const settings = await BrandSettings.findOne({ where: { organizationId }, transaction: t })
    if (!settings) {
      throw new AuthError("Brand settings not found", 404)
    }

    if (settings.logoStorageKey) {
      await objectStorage.delete(settings.logoStorageKey)
    }

    settings.logoUrl = null
    settings.logoStorageKey = null
    await settings.save({ transaction: t })
    return settings
  })
}
