"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("stock_movements", "supplier_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "suppliers", key: "id" },
    })
    await queryInterface.addIndex("stock_movements", ["organization_id", "supplier_id"])
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("stock_movements", "supplier_id")
  },
}
