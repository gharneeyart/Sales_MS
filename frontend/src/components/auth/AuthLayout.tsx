import type { ReactNode } from "react"
import { Store } from "lucide-react"

import { AuthCardShell } from "./AuthCardShell"

// Pre-auth screens (login/signup) can't show a tenant's brand yet — that
// only loads after authentication, from BrandSettings (A.6). This is the
// product's own identity, not a business's.
const PRODUCT_NAME = "Sales Dashboard"

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthCardShell
      header={
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Store className="size-6" />
          </div>
          <span className="text-lg font-semibold text-foreground">{PRODUCT_NAME}</span>
        </div>
      }
    >
      {children}
    </AuthCardShell>
  )
}

export { AuthLayout }
