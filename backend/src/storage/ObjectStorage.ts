export interface UploadInput {
  buffer: Buffer
  contentType: string
  extension: string
  /** Groups related uploads, e.g. "logos" — becomes a path segment. */
  keyPrefix: string
}

export interface UploadResult {
  key: string
  url: string
}

/**
 * A.4 calls for an S3-compatible bucket (Supabase Storage / Cloudflare R2 /
 * Cloudinary) in production. This interface is the seam: `localStorage.ts`
 * implements it against local disk for dev (no cloud account needed to
 * build against), and a production deploy swaps in an S3-backed
 * implementation without touching any caller.
 */
export interface ObjectStorage {
  upload(input: UploadInput): Promise<UploadResult>
  delete(key: string): Promise<void>
}
