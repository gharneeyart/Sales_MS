import "dotenv/config"

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL"),
  corsOrigins: required("CORS_ORIGINS").split(",").map((origin) => origin.trim()),
  // Phase 0 stand-in for real auth (A.7 lands in Phase 1) — proves the
  // frontend->API round trip requires a credential without building JWTs yet.
  helloApiToken: required("HELLO_API_TOKEN"),
}
