import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize"

import { sequelize } from "../sequelize"
import type { MembershipRole } from "./Membership"

export type InviteStatus = "PENDING" | "ACCEPTED" | "REVOKED"

export class Invite extends Model<InferAttributes<Invite>, InferCreationAttributes<Invite>> {
  declare id: CreationOptional<string>
  declare organizationId: string
  declare email: string
  declare role: MembershipRole
  declare status: CreationOptional<InviteStatus>
  declare invitedByUserId: string
  declare expiresAt: Date
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

Invite.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM("OWNER", "STAFF"), allowNull: false },
    status: {
      type: DataTypes.ENUM("PENDING", "ACCEPTED", "REVOKED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    invitedByUserId: { type: DataTypes.UUID, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "Invite",
    tableName: "invites",
    underscored: true,
  }
)
