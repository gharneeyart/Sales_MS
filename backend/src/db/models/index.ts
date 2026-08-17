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
}
