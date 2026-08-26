import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize"

import { sequelize } from "../sequelize"

export type AutomationTrigger = "LOW_STOCK" | "DEBT_OVERDUE" | "SCHEDULE"
export type AutomationAction = "SEND_NOTIFICATION"
export type NotificationChannel = "EMAIL" | "WHATSAPP"

export interface LowStockConfig {
  channel: NotificationChannel
}
export interface DebtOverdueConfig {
  daysOverdue: number
  channel: NotificationChannel
}
export interface DailySalesSummaryConfig {
  sendTime: string // "HH:mm", WAT
  channel: NotificationChannel
}
export type AutomationConfig = LowStockConfig | DebtOverdueConfig | DailySalesSummaryConfig

export class AutomationRule extends Model<
  InferAttributes<AutomationRule>,
  InferCreationAttributes<AutomationRule>
> {
  declare id: CreationOptional<string>
  declare organizationId: string
  declare trigger: AutomationTrigger
  declare config: AutomationConfig
  declare action: CreationOptional<AutomationAction>
  declare enabled: CreationOptional<boolean>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

AutomationRule.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    trigger: { type: DataTypes.ENUM("LOW_STOCK", "DEBT_OVERDUE", "SCHEDULE"), allowNull: false },
    config: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    action: { type: DataTypes.ENUM("SEND_NOTIFICATION"), allowNull: false, defaultValue: "SEND_NOTIFICATION" },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "AutomationRule",
    tableName: "automation_rules",
    underscored: true,
  }
)
