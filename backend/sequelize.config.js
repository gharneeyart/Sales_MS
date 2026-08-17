require("dotenv/config")

const url = process.env.DATABASE_URL

module.exports = {
  development: { url, dialect: "postgres" },
  test: { url: process.env.TEST_DATABASE_URL ?? url, dialect: "postgres" },
  production: { url, dialect: "postgres" },
}
