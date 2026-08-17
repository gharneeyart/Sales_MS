"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("stock_movements", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "products", key: "id" },
        onDelete: "CASCADE",
      },
      change: { type: Sequelize.INTEGER, allowNull: false },
      reason: {
        type: Sequelize.ENUM("SALE", "RESTOCK", "ADJUSTMENT", "RETURN"),
        allowNull: false,
      },
      performed_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex("stock_movements", ["organization_id", "product_id", "created_at"])
    await queryInterface.sequelize.query(`
      ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "stock_movements" FORCE ROW LEVEL SECURITY;
      CREATE POLICY org_isolation ON "stock_movements"
        USING (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
        WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
    `)
  },

  async down(queryInterface) {
    await queryInterface.dropTable("stock_movements")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_stock_movements_reason";')
  },
}
