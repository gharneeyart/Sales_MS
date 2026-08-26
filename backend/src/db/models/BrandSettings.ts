import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize"

import { sequelize } from "../sequelize"

export const DEFAULT_PRIMARY_COLOR = "#0C6B5E"
export const DEFAULT_SECONDARY_COLOR = "#084F45"
export const DEFAULT_ACCENT_COLOR = "#C96F44"

export class BrandSettings extends Model<
  InferAttributes<BrandSettings>,
  InferCreationAttributes<BrandSettings>
> {
  declare id: CreationOptional<string>
  declare organizationId: string
  declare displayName: string
  declare logoUrl: CreationOptional<string | null>
  declare logoStorageKey: CreationOptional<string | null>
  declare primaryColor: CreationOptional<string>
  declare secondaryColor: CreationOptional<string>
  declare accentColor: CreationOptional<string>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

BrandSettings.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    organizationId: { type: DataTypes.UUID, allowNull: false, unique: true },
    displayName: { type: DataTypes.STRING, allowNull: false },
    logoUrl: { type: DataTypes.STRING, allowNull: true },
    logoStorageKey: { type: DataTypes.STRING, allowNull: true },
    primaryColor: { type: DataTypes.STRING, allowNull: false, defaultValue: DEFAULT_PRIMARY_COLOR },
    secondaryColor: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: DEFAULT_SECONDARY_COLOR,
    },
    accentColor: { type: DataTypes.STRING, allowNull: false, defaultValue: DEFAULT_ACCENT_COLOR },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "BrandSettings",
    tableName: "brand_settings",
    underscored: true,
  }
)
