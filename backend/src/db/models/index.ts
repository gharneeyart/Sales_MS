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
import { Customer } from "./Customer"
import { Sale } from "./Sale"
import { SaleItem } from "./SaleItem"
import { Payment } from "./Payment"
import { Supplier } from "./Supplier"
import { AutomationRule } from "./AutomationRule"
import { NotificationLog } from "./NotificationLog"
import { Invite } from "./Invite"

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

Organization.hasMany(Customer, { foreignKey: "organizationId" })
Customer.belongsTo(Organization, { foreignKey: "organizationId" })

Customer.hasMany(Sale, { foreignKey: "customerId" })
Sale.belongsTo(Customer, { foreignKey: "customerId", as: "Customer" })

User.hasMany(Sale, { foreignKey: "recordedByUserId" })
Sale.belongsTo(User, { foreignKey: "recordedByUserId", as: "RecordedBy" })

Sale.hasMany(SaleItem, { foreignKey: "saleId", as: "SaleItems" })
SaleItem.belongsTo(Sale, { foreignKey: "saleId" })

Product.hasMany(SaleItem, { foreignKey: "productId" })
SaleItem.belongsTo(Product, { foreignKey: "productId" })

Sale.hasMany(Payment, { foreignKey: "saleId", as: "Payments" })
Payment.belongsTo(Sale, { foreignKey: "saleId" })

User.hasMany(Payment, { foreignKey: "receivedByUserId" })
Payment.belongsTo(User, { foreignKey: "receivedByUserId", as: "ReceivedBy" })

Organization.hasMany(Supplier, { foreignKey: "organizationId" })
Supplier.belongsTo(Organization, { foreignKey: "organizationId" })

Supplier.hasMany(StockMovement, { foreignKey: "supplierId" })
StockMovement.belongsTo(Supplier, { foreignKey: "supplierId", as: "Supplier" })

Organization.hasMany(AutomationRule, { foreignKey: "organizationId" })
AutomationRule.belongsTo(Organization, { foreignKey: "organizationId" })

Organization.hasMany(NotificationLog, { foreignKey: "organizationId" })
NotificationLog.belongsTo(Organization, { foreignKey: "organizationId" })

AutomationRule.hasMany(NotificationLog, { foreignKey: "automationRuleId" })
NotificationLog.belongsTo(AutomationRule, { foreignKey: "automationRuleId" })

Organization.hasMany(Invite, { foreignKey: "organizationId" })
Invite.belongsTo(Organization, { foreignKey: "organizationId" })

User.hasMany(Invite, { foreignKey: "invitedByUserId" })
Invite.belongsTo(User, { foreignKey: "invitedByUserId", as: "InvitedBy" })

Organization.hasMany(ActivityLog, { foreignKey: "organizationId" })
ActivityLog.belongsTo(Organization, { foreignKey: "organizationId" })

User.hasMany(ActivityLog, { foreignKey: "actorUserId" })
ActivityLog.belongsTo(User, { foreignKey: "actorUserId", as: "Actor" })

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
  Customer,
  Sale,
  SaleItem,
  Payment,
  Supplier,
  AutomationRule,
  NotificationLog,
  Invite,
}
