"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("notification_logs", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      automation_rule_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "automation_rules", key: "id" },
      },
      channel: { type: Sequelize.ENUM("EMAIL", "WHATSAPP"), allowNull: false },
      payload: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      status: { type: Sequelize.ENUM("SENT", "FAILED"), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex("notification_logs", ["organization_id", "created_at"])
    await queryInterface.sequelize.query(`
      ALTER TABLE "notification_logs" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "notification_logs" FORCE ROW LEVEL SECURITY;
      CREATE POLICY org_isolation ON "notification_logs"
        USING (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
        WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
    `)
  },

  async down(queryInterface) {
    await queryInterface.dropTable("notification_logs")
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_notification_logs_channel";
      DROP TYPE IF EXISTS "enum_notification_logs_status";
    `)
  },
}
