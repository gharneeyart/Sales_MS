"use strict"

const STARTER_PLAN_ID = "00000000-0000-4000-8000-000000000002"
const PRO_PLAN_ID = "00000000-0000-4000-8000-000000000003"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("plans", [
      {
        id: STARTER_PLAN_ID,
        name: "Starter",
        price_kobo: 500000,
        limits: JSON.stringify({ maxProducts: 300, maxStaff: 5 }),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: PRO_PLAN_ID,
        name: "Pro",
        price_kobo: 1500000,
        // No maxProducts key — entitlements.ts treats a falsy limit as unlimited.
        limits: JSON.stringify({ maxStaff: 15 }),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("plans", { id: [STARTER_PLAN_ID, PRO_PLAN_ID] })
  },
}

module.exports.STARTER_PLAN_ID = STARTER_PLAN_ID
module.exports.PRO_PLAN_ID = PRO_PLAN_ID
