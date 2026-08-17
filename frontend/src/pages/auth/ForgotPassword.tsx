import { Link } from "react-router-dom"

import { AuthLayout } from "@/components/auth/AuthLayout"

function ForgotPassword() {
  return (
    <AuthLayout>
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-semibold text-foreground">Password reset</h1>
        <p className="text-sm text-muted-foreground">
          Password reset isn't built yet — it lands in a later phase, alongside email delivery.
        </p>
        <Link to="/login" className="text-sm font-medium text-primary hover:underline">
          Back to log in
        </Link>
      </div>
    </AuthLayout>
  )
}

export { ForgotPassword }
