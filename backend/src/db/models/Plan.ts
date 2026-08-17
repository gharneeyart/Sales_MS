import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize"

import { sequelize } from "../sequelize"

export interface PlanLimits {
  maxProducts?: number
  maxStaff?: number
  [key: string]: unknown
}

export class Plan extends Model<InferAttributes<Plan>, InferCreationAttributes<Plan>> {
  declare id: CreationOptional<string>
  declare name: string
  declare priceKobo: CreationOptional<number>
  declare limits: CreationOptional<PlanLimits>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

Plan.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING, allowNull: false },
    priceKobo: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    limits: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "Plan",
    tableName: "plans",
    underscored: true,
  }
)
