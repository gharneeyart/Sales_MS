import { Route, Routes } from "react-router-dom"
import {
  BarChart3,
  Package,
  Receipt,
  Settings as SettingsIcon,
  Truck,
  Users,
} from "lucide-react"

import { AppShell } from "@/components/layout/AppShell"
import { Toaster } from "@/components/ui/sonner"
import { Dashboard } from "@/pages/Dashboard"
import { PlaceholderPage } from "@/pages/PlaceholderPage"

function App() {
  return (
    <>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/sales"
            element={
              <PlaceholderPage
                title="Sales"
                description="Record sales, take payments, and manage credit."
                icon={Receipt}
                phase="Phase 4"
              />
            }
          />
          <Route
            path="/products"
            element={
              <PlaceholderPage
                title="Products"
                description="Manage your catalogue, pricing, and stock."
                icon={Package}
                phase="Phase 3"
              />
            }
          />
          <Route
            path="/customers"
            element={
              <PlaceholderPage
                title="Customers"
                description="Track customer contacts and balances owed."
                icon={Users}
                phase="Phase 4"
              />
            }
          />
          <Route
            path="/suppliers"
            element={
              <PlaceholderPage
                title="Suppliers"
                description="Manage suppliers and goods received."
                icon={Truck}
                phase="Phase 5"
              />
            }
          />
          <Route
            path="/reports"
            element={
              <PlaceholderPage
                title="Reports"
                description="See how the business is doing over time."
                icon={BarChart3}
                phase="Phase 7"
              />
            }
          />
          <Route
            path="/settings"
            element={
              <PlaceholderPage
                title="Settings"
                description="Branding, team, and subscription settings."
                icon={SettingsIcon}
                phase="Phase 2"
              />
            }
          />
        </Routes>
      </AppShell>
      <Toaster />
    </>
  )
}

export default App
