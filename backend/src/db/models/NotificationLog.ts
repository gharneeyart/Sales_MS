import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize"

import { sequelize } from "../sequelize"
import type { NotificationChannel } from "./AutomationRule"

export type NotificationStatus = "SENT" | "FAILED"

export class NotificationLog extends Model<
  InferAttributes<NotificationLog>,
  InferCreationAttributes<NotificationLog>
> {
  declare id: CreationOptional<string>
  declare organizationId: string
  declare automationRuleId: string | null
  declare channel: NotificationChannel
  declare payload: Record<string, unknown>
  declare status: NotificationStatus
  declare createdAt: CreationOptional<Date>
}

NotificationLog.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    automationRuleId: { type: DataTypes.UUID, allowNull: true },
    channel: { type: DataTypes.ENUM("EMAIL", "WHATSAPP"), allowNull: false },
    payload: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    status: { type: DataTypes.ENUM("SENT", "FAILED"), allowNull: false },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "NotificationLog",
    tableName: "notification_logs",
    underscored: true,
    updatedAt: false,
  }
)
