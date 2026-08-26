import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from "sequelize"

import { sequelize } from "../sequelize"
import type { Product } from "./Product"

export type PriceType = "WHOLESALE" | "RETAIL"

export class SaleItem extends Model<InferAttributes<SaleItem>, InferCreationAttributes<SaleItem>> {
  declare id: CreationOptional<string>
  declare organizationId: string
  declare saleId: string
  declare productId: string
  declare quantity: number
  declare unitPriceAtSale: number
  declare costAtSale: number
  declare priceType: PriceType
  declare createdAt: CreationOptional<Date>

  declare Product?: NonAttribute<Product>
}

SaleItem.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    saleId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unitPriceAtSale: { type: DataTypes.INTEGER, allowNull: false },
    costAtSale: { type: DataTypes.INTEGER, allowNull: false },
    priceType: { type: DataTypes.ENUM("WHOLESALE", "RETAIL"), allowNull: false },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "SaleItem",
    tableName: "sale_items",
    underscored: true,
    updatedAt: false,
  }
)
