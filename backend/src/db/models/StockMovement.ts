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

export type StockMovementReason = "SALE" | "RESTOCK" | "ADJUSTMENT" | "RETURN"

export class StockMovement extends Model<
  InferAttributes<StockMovement>,
  InferCreationAttributes<StockMovement>
> {
  declare id: CreationOptional<string>
  declare organizationId: string
  declare productId: string
  declare change: number
  declare reason: StockMovementReason
  declare performedByUserId: string
  declare createdAt: CreationOptional<Date>
  declare User?: NonAttribute<User>
}

StockMovement.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    change: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.ENUM("SALE", "RESTOCK", "ADJUSTMENT", "RETURN"), allowNull: false },
    performedByUserId: { type: DataTypes.UUID, allowNull: false },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "StockMovement",
    tableName: "stock_movements",
    underscored: true,
    updatedAt: false,
  }
)
