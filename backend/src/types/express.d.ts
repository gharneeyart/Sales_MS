import type { AccessTokenPayload } from "../auth/tokens"

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload
      /** Raw request bytes, captured by express.json()'s `verify` hook — needed to check the Paystack webhook's HMAC signature, which is computed over the exact bytes sent, not the re-serialized parsed body. */
      rawBody?: Buffer
    }
  }
}

export {}
