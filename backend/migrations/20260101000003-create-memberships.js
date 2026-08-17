"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("memberships", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      role: { type: Sequelize.ENUM("OWNER", "STAFF"), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addConstraint("memberships", {
      fields: ["organization_id", "user_id"],
      type: "unique",
      name: "memberships_organization_id_user_id_unique",
    })

    await queryInterface.addIndex("memberships", ["organization_id"])
    await queryInterface.addIndex("memberships", ["user_id"])
  },

  async down(queryInterface) {
    await queryInterface.dropTable("memberships")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_memberships_role";')
  },
}
