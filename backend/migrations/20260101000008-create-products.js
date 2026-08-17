"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("products", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      name: { type: Sequelize.STRING, allowNull: false },
      category: { type: Sequelize.STRING, allowNull: true },
      sku: { type: Sequelize.STRING, allowNull: true },
      unit_label: { type: Sequelize.STRING, allowNull: false },
      cost_price: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      wholesale_price: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      retail_price: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      stock_qty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      reorder_level: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex("products", ["organization_id", "created_at"])
    await queryInterface.addIndex("products", ["organization_id", "name"])
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX products_org_sku_unique ON "products" (organization_id, sku)
      WHERE sku IS NOT NULL AND deleted_at IS NULL;

      ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "products" FORCE ROW LEVEL SECURITY;
      CREATE POLICY org_isolation ON "products"
        USING (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
        WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
    `)
  },

  async down(queryInterface) {
    await queryInterface.dropTable("products")
  },
}
