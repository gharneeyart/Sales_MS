export interface UploadInput {
  buffer: Buffer
  contentType: string
  extension: string
  /** Groups related uploads, e.g. "logos" — becomes a path segment. */
  keyPrefix: string
  /** "image" for logos, "raw" for PDFs and other non-image files. Defaults to "image". */
  resourceType?: "image" | "raw"
}

export interface UploadResult {
  key: string
  url: string
}

export interface ObjectStorage {
  upload(input: UploadInput): Promise<UploadResult>
  delete(key: string): Promise<void>
}
