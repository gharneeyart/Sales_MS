"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("payments", {
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
      amount: { type: Sequelize.INTEGER, allowNull: false },
      method: { type: Sequelize.ENUM("CASH", "TRANSFER", "POS", "OTHER"), allowNull: false },
      received_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex("payments", ["organization_id", "sale_id"])
    await queryInterface.sequelize.query(`
      ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;
      CREATE POLICY org_isolation ON "payments"
        USING (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
        WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
    `)
  },

  async down(queryInterface) {
    await queryInterface.dropTable("payments")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_method";')
  },
}
