"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("invites", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      email: { type: Sequelize.STRING, allowNull: false },
      role: { type: Sequelize.ENUM("OWNER", "STAFF"), allowNull: false },
      status: {
        type: Sequelize.ENUM("PENDING", "ACCEPTED", "REVOKED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      invited_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex("invites", ["organization_id", "status"])
    await queryInterface.sequelize.query(`
      ALTER TABLE "invites" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "invites" FORCE ROW LEVEL SECURITY;
      CREATE POLICY org_isolation ON "invites"
        USING (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
        WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
    `)
  },

  async down(queryInterface) {
    await queryInterface.dropTable("invites")
  },
}
