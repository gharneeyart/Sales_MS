import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize"

import { sequelize } from "../sequelize"

export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED"

export class Subscription extends Model<
  InferAttributes<Subscription>,
  InferCreationAttributes<Subscription>
> {
  declare id: CreationOptional<string>
  declare organizationId: string
  declare planId: string
  declare status: CreationOptional<SubscriptionStatus>
  declare currentPeriodEnd: CreationOptional<Date | null>
  declare providerCustomerRef: CreationOptional<string | null>
  declare providerSubscriptionRef: CreationOptional<string | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

Subscription.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    organizationId: { type: DataTypes.UUID, allowNull: false, unique: true },
    planId: { type: DataTypes.UUID, allowNull: false },
    status: {
      type: DataTypes.ENUM("TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED"),
      allowNull: false,
      defaultValue: "TRIALING",
    },
    currentPeriodEnd: { type: DataTypes.DATE, allowNull: true },
    providerCustomerRef: { type: DataTypes.STRING, allowNull: true },
    providerSubscriptionRef: { type: DataTypes.STRING, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "Subscription",
    tableName: "subscriptions",
    underscored: true,
  }
)
