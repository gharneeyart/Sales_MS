"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("sales", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      customer_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "customers", key: "id" },
      },
      status: {
        type: Sequelize.ENUM("PENDING", "PARTIALLY_PAID", "PAID", "CANCELLED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      total_amount: { type: Sequelize.INTEGER, allowNull: false },
      recorded_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      receipt_number: { type: Sequelize.STRING, allowNull: false },
      latest_receipt_url: { type: Sequelize.STRING, allowNull: true },
      receipt_generated_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex("sales", ["organization_id", "created_at"])
    await queryInterface.addIndex("sales", ["organization_id", "customer_id"])
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX sales_org_receipt_number_unique ON "sales" (organization_id, receipt_number);

      ALTER TABLE "sales" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "sales" FORCE ROW LEVEL SECURITY;
      CREATE POLICY org_isolation ON "sales"
        USING (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
        WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
    `)
  },

  async down(queryInterface) {
    await queryInterface.dropTable("sales")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_status";')
  },
}
