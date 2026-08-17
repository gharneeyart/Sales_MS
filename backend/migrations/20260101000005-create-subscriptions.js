"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("subscriptions", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      plan_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plans", key: "id" },
      },
      status: {
        type: Sequelize.ENUM("TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED"),
        allowNull: false,
        defaultValue: "TRIALING",
      },
      current_period_end: { type: Sequelize.DATE, allowNull: true },
      provider_customer_ref: { type: Sequelize.STRING, allowNull: true },
      provider_subscription_ref: { type: Sequelize.STRING, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex("subscriptions", ["organization_id"])
  },

  async down(queryInterface) {
    await queryInterface.dropTable("subscriptions")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_subscriptions_status";')
  },
}
