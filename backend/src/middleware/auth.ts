import type { NextFunction, Request, Response } from "express"

import { env } from "../config/env"

// Phase 0 stand-in for the real access-token flow (A.7, Phase 1). Just
// enough to prove the round trip is authenticated end to end.
export function requireHelloToken(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization")
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined

  if (!token || token !== env.helloApiToken) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  next()
}
