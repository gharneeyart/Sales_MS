"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("sale_items", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      sale_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "sales", key: "id" },
        onDelete: "CASCADE",
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "products", key: "id" },
      },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      unit_price_at_sale: { type: Sequelize.INTEGER, allowNull: false },
      cost_at_sale: { type: Sequelize.INTEGER, allowNull: false },
      price_type: { type: Sequelize.ENUM("WHOLESALE", "RETAIL"), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex("sale_items", ["organization_id", "sale_id"])
    await queryInterface.sequelize.query(`
      ALTER TABLE "sale_items" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "sale_items" FORCE ROW LEVEL SECURITY;
      CREATE POLICY org_isolation ON "sale_items"
        USING (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
        WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
    `)
  },

  async down(queryInterface) {
    await queryInterface.dropTable("sale_items")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sale_items_price_type";')
  },
}
