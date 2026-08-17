import { Organization } from "./Organization"
import { User } from "./User"
import { Membership } from "./Membership"
import { Plan } from "./Plan"
import { Subscription } from "./Subscription"
import {
  BrandSettings,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
} from "./BrandSettings"
import { Product } from "./Product"
import { StockMovement } from "./StockMovement"
import { ActivityLog } from "./ActivityLog"

Organization.hasMany(Membership, { foreignKey: "organizationId" })
Membership.belongsTo(Organization, { foreignKey: "organizationId" })

User.hasMany(Membership, { foreignKey: "userId" })
Membership.belongsTo(User, { foreignKey: "userId" })

Organization.hasOne(Subscription, { foreignKey: "organizationId" })
Subscription.belongsTo(Organization, { foreignKey: "organizationId" })

Plan.hasMany(Subscription, { foreignKey: "planId" })
Subscription.belongsTo(Plan, { foreignKey: "planId" })

Organization.hasOne(BrandSettings, { foreignKey: "organizationId" })
BrandSettings.belongsTo(Organization, { foreignKey: "organizationId" })

Organization.hasMany(Product, { foreignKey: "organizationId" })
Product.belongsTo(Organization, { foreignKey: "organizationId" })

Product.hasMany(StockMovement, { foreignKey: "productId" })
StockMovement.belongsTo(Product, { foreignKey: "productId" })

User.hasMany(StockMovement, { foreignKey: "performedByUserId" })
StockMovement.belongsTo(User, { foreignKey: "performedByUserId" })

export {
  Organization,
  User,
  Membership,
  Plan,
  Subscription,
  BrandSettings,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  DEFAULT_ACCENT_COLOR,
  Product,
  StockMovement,
  ActivityLog,
}
