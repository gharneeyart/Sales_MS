import { v2 as cloudinary } from "cloudinary"

import type { ObjectStorage, UploadInput, UploadResult } from "./ObjectStorage"

// Reads CLOUDINARY_URL from process.env automatically.
class CloudinaryObjectStorage implements ObjectStorage {
  async upload({ buffer, keyPrefix, resourceType = "image" }: UploadInput): Promise<UploadResult> {
    const result = await new Promise<{ public_id: string; secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: keyPrefix, resource_type: resourceType },
        (error, res) => (error || !res ? reject(error) : resolve(res))
      )
      stream.end(buffer)
    })
    return { key: result.public_id, url: result.secure_url }
  }

  async delete(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key)
  }
}

export const objectStorage: ObjectStorage = new CloudinaryObjectStorage()
