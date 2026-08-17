import type { AccessTokenPayload } from "../auth/tokens"

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload
    }
  }
}

export {}
