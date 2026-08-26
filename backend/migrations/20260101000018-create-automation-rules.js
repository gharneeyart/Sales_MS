"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("automation_rules", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      trigger: {
        type: Sequelize.ENUM("LOW_STOCK", "DEBT_OVERDUE", "SCHEDULE"),
        allowNull: false,
      },
      config: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      action: { type: Sequelize.ENUM("SEND_NOTIFICATION"), allowNull: false, defaultValue: "SEND_NOTIFICATION" },
      enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX automation_rules_org_trigger_unique ON "automation_rules" (organization_id, trigger);

      ALTER TABLE "automation_rules" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "automation_rules" FORCE ROW LEVEL SECURITY;
      CREATE POLICY org_isolation ON "automation_rules"
        USING (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
        WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
    `)
  },

  async down(queryInterface) {
    await queryInterface.dropTable("automation_rules")
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_automation_rules_trigger";
      DROP TYPE IF EXISTS "enum_automation_rules_action";
    `)
  },
}
