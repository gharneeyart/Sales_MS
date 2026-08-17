import type { NextFunction, Request, Response } from "express"

import { verifyAccessToken } from "../auth/tokens"

// A.7 — the API derives user + org from the verified access token, never
// from the request body. Every mutating/tenant-scoped route sits behind
// this.
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization")
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined

  if (!token) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  try {
    req.auth = verifyAccessToken(token)
    next()
  } catch {
    res.status(401).json({ error: "Invalid or expired token" })
  }
}
