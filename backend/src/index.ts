import "./instrument"
import { app } from "./app"
import { env } from "./config/env"
import { sequelize } from "./db/sequelize"
import { redis } from "./redis/client"

async function main() {
  await sequelize.authenticate()
  console.log("Postgres connected")

  await redis.ping()
  console.log("Redis connected")

  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`)
  })
}

main().catch((error) => {
  console.error("Failed to start API", error)
  process.exit(1)
})
