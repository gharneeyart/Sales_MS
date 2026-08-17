import { Route, Routes } from "react-router-dom"
import { BarChart3, Package, Receipt, Truck, Users } from "lucide-react"

import { AppShell } from "@/components/layout/AppShell"
import { Toaster } from "@/components/ui/sonner"
import { ProtectedRoute, PublicOnlyRoute } from "@/components/ProtectedRoute"
import { Dashboard } from "@/pages/Dashboard"
import { Settings } from "@/pages/Settings"
import { PlaceholderPage } from "@/pages/PlaceholderPage"
import { Login } from "@/pages/auth/Login"
import { Signup } from "@/pages/auth/Signup"
import { AcceptInvite } from "@/pages/auth/AcceptInvite"
import { ForgotPassword } from "@/pages/auth/ForgotPassword"

function App() {
  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <Signup />
            </PublicOnlyRoute>
          }
        />
        <Route path="/accept-invite/:token" element={<AcceptInvite />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
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
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster />
    </>
  )
}

export default App
