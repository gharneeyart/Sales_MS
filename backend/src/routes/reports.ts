import { Router } from "express"

import { authenticate } from "../middleware/authenticate"
import { HttpError } from "../errors"
import { getReports, resolveDateRange } from "../services/reportService"

export const reportsRouter = Router()
reportsRouter.use(authenticate)

reportsRouter.get("/", async (req, res, next) => {
  try {
    const range = resolveDateRange(
      typeof req.query.from === "string" ? req.query.from : undefined,
      typeof req.query.to === "string" ? req.query.to : undefined
    )
    res.json(await getReports(req.auth!.orgId, range))
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    next(error)
  }
})
