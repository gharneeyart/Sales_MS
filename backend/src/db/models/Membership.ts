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

export type MembershipRole = "OWNER" | "STAFF"

export class Membership extends Model<
  InferAttributes<Membership>,
  InferCreationAttributes<Membership>
> {
  declare id: CreationOptional<string>
  declare organizationId: string
  declare userId: string
  declare role: MembershipRole
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  declare User?: NonAttribute<User>
}

Membership.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    role: { type: DataTypes.ENUM("OWNER", "STAFF"), allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "Membership",
    tableName: "memberships",
    underscored: true,
  }
)
