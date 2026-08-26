import { Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Toaster } from "@/components/ui/sonner"
import { ProtectedRoute, PublicOnlyRoute } from "@/components/ProtectedRoute"
import { Dashboard } from "@/pages/Dashboard"
import { Settings } from "@/pages/Settings"
import { Products } from "@/pages/Products"
import { ProductDetail } from "@/pages/ProductDetail"
import { Sales } from "@/pages/Sales"
import { NewSale } from "@/pages/NewSale"
import { SaleDetail } from "@/pages/SaleDetail"
import { ReceiptView } from "@/pages/ReceiptView"
import { Customers } from "@/pages/Customers"
import { CustomerDetail } from "@/pages/CustomerDetail"
import { Suppliers } from "@/pages/Suppliers"
import { GoodsReceived } from "@/pages/GoodsReceived"
import { Reports } from "@/pages/Reports"
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

        {/* No AppShell chrome — this is a printable document. */}
        <Route
          path="/sales/:id/receipt"
          element={
            <ProtectedRoute>
              <ReceiptView />
            </ProtectedRoute>
          }
        />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/sales/new" element={<NewSale />} />
                  <Route path="/sales/:id" element={<SaleDetail />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/customers/:id" element={<CustomerDetail />} />
                  <Route path="/suppliers" element={<Suppliers />} />
                  <Route path="/suppliers/goods-received" element={<GoodsReceived />} />
                  <Route path="/reports" element={<Reports />} />
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
