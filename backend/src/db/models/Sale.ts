import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from "sequelize"

import { sequelize } from "../sequelize"
import type { Customer } from "./Customer"
import type { User } from "./User"
import type { SaleItem } from "./SaleItem"
import type { Payment } from "./Payment"

export type SaleStatus = "PENDING" | "PARTIALLY_PAID" | "PAID" | "CANCELLED"

export class Sale extends Model<InferAttributes<Sale>, InferCreationAttributes<Sale>> {
  declare id: CreationOptional<string>
  declare organizationId: string
  declare customerId: string | null
  declare status: CreationOptional<SaleStatus>
  declare totalAmount: number
  declare recordedByUserId: string
  declare receiptNumber: string
  declare latestReceiptUrl: CreationOptional<string | null>
  declare receiptGeneratedAt: CreationOptional<Date | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  declare Customer?: NonAttribute<Customer>
  declare RecordedBy?: NonAttribute<User>
  declare SaleItems?: NonAttribute<SaleItem[]>
  declare Payments?: NonAttribute<Payment[]>
}

Sale.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    customerId: { type: DataTypes.UUID, allowNull: true },
    status: {
      type: DataTypes.ENUM("PENDING", "PARTIALLY_PAID", "PAID", "CANCELLED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    totalAmount: { type: DataTypes.INTEGER, allowNull: false },
    recordedByUserId: { type: DataTypes.UUID, allowNull: false },
    receiptNumber: { type: DataTypes.STRING, allowNull: false },
    latestReceiptUrl: { type: DataTypes.STRING, allowNull: true },
    receiptGeneratedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "Sale",
    tableName: "sales",
    underscored: true,
  }
)
