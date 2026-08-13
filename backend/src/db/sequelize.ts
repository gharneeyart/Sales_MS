import { Sequelize } from "sequelize"

import { env } from "../config/env"

// Bounded pool per A.10 — a persistent Node backend holds a bounded Postgres
// pool so many concurrent requests don't exhaust the database.
export const sequelize = new Sequelize(env.databaseUrl, {
  dialect: "postgres",
  logging: false,
  pool: {
    max: 10,
    min: 0,
    idle: 10_000,
    acquire: 30_000,
  },
})
