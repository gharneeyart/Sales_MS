"use strict"

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("payments", ["organization_id", "created_at"])
  },
  async down(queryInterface) {
    await queryInterface.removeIndex("payments", ["organization_id", "created_at"])
  },
}
