import type { NextFunction, Request, Response } from "express"

import type { MembershipRole } from "../db/models/Membership"

export function requireRole(...roles: MembershipRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      res.status(403).json({ error: "Forbidden" })
      return
    }
    next()
  }
}
