"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("organizations", "receipt_counter", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    })
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("organizations", "receipt_counter")
  },
}
