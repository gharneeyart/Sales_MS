"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("brand_settings", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      display_name: { type: Sequelize.STRING, allowNull: false },
      logo_url: { type: Sequelize.STRING, allowNull: true },
      logo_storage_key: { type: Sequelize.STRING, allowNull: true },
      primary_color: { type: Sequelize.STRING, allowNull: false, defaultValue: "#2563eb" },
      secondary_color: { type: Sequelize.STRING, allowNull: false, defaultValue: "#0d9488" },
      accent_color: { type: Sequelize.STRING, allowNull: false, defaultValue: "#0d9488" },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex("brand_settings", ["organization_id"])

    // Same isolation approach as memberships/subscriptions (A.3) — see
    // migrations/20260101000006-enable-rls.js for why FORCE + nullif(...)
    // matter, not just ENABLE.
    await queryInterface.sequelize.query(`
      ALTER TABLE "brand_settings" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "brand_settings" FORCE ROW LEVEL SECURITY;
      CREATE POLICY org_isolation ON "brand_settings"
        USING (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
        WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
    `)
  },

  async down(queryInterface) {
    await queryInterface.dropTable("brand_settings")
  },
}
