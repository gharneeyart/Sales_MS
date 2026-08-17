"use strict"

const FREE_PLAN_ID = "00000000-0000-4000-8000-000000000001"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("plans", [
      {
        id: FREE_PLAN_ID,
        name: "Free",
        price_kobo: 0,
        limits: JSON.stringify({ maxProducts: 50, maxStaff: 2 }),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("plans", { id: FREE_PLAN_ID })
  },
}

module.exports.FREE_PLAN_ID = FREE_PLAN_ID
