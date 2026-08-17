import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"

import { useAuth } from "@/contexts/AuthContext"
import { FullscreenLoading } from "./FullscreenLoading"

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { state } = useAuth()

  if (state.status === "loading") return <FullscreenLoading />
  if (state.status === "unauthenticated") return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { state } = useAuth()

  if (state.status === "loading") return <FullscreenLoading />
  if (state.status === "authenticated") return <Navigate to="/" replace />
  return <>{children}</>
}

export { ProtectedRoute, PublicOnlyRoute }
