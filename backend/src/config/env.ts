import "dotenv/config"

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

required("CLOUDINARY_URL") // read directly from process.env by the cloudinary SDK

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL"),
  corsOrigins: required("CORS_ORIGINS").split(",").map((origin) => origin.trim()),

  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  jwtInviteSecret: required("JWT_INVITE_SECRET"),
  accessTokenTtl: "15m",
  refreshTokenTtlDays: 30,

  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  paystackSecretKey: required("PAYSTACK_SECRET_KEY"),
}
