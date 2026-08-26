import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from "sequelize"

import { sequelize } from "../sequelize"
import type { User } from "./User"

export type PaymentMethod = "CASH" | "TRANSFER" | "POS" | "OTHER"

export class Payment extends Model<InferAttributes<Payment>, InferCreationAttributes<Payment>> {
  declare id: CreationOptional<string>
  declare organizationId: string
  declare saleId: string
  declare amount: number
  declare method: PaymentMethod
  declare receivedByUserId: string
  declare createdAt: CreationOptional<Date>

  declare ReceivedBy?: NonAttribute<User>
}

Payment.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    saleId: { type: DataTypes.UUID, allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    method: { type: DataTypes.ENUM("CASH", "TRANSFER", "POS", "OTHER"), allowNull: false },
    receivedByUserId: { type: DataTypes.UUID, allowNull: false },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "Payment",
    tableName: "payments",
    underscored: true,
    updatedAt: false,
  }
)
