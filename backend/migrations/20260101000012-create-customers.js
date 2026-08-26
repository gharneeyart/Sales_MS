"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("customers", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      name: { type: Sequelize.STRING, allowNull: false },
      phone: { type: Sequelize.STRING, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex("customers", ["organization_id", "created_at"])
    await queryInterface.addIndex("customers", ["organization_id", "name"])
    await queryInterface.sequelize.query(`
      ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "customers" FORCE ROW LEVEL SECURITY;
      CREATE POLICY org_isolation ON "customers"
        USING (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
        WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
    `)
  },

  async down(queryInterface) {
    await queryInterface.dropTable("customers")
  },
}
