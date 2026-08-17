import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize"

import { sequelize } from "../sequelize"

export class Product extends Model<InferAttributes<Product>, InferCreationAttributes<Product>> {
  declare id: CreationOptional<string>
  declare organizationId: string
  declare name: string
  declare category: string | null
  declare sku: string | null
  declare unitLabel: string
  declare costPrice: CreationOptional<number>
  declare wholesalePrice: CreationOptional<number>
  declare retailPrice: CreationOptional<number>
  declare stockQty: CreationOptional<number>
  declare reorderLevel: CreationOptional<number>
  declare deletedAt: CreationOptional<Date | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

Product.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: true },
    sku: { type: DataTypes.STRING, allowNull: true },
    unitLabel: { type: DataTypes.STRING, allowNull: false },
    costPrice: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    wholesalePrice: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    retailPrice: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    stockQty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    reorderLevel: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "Product",
    tableName: "products",
    underscored: true,
    paranoid: true,
  }
)
