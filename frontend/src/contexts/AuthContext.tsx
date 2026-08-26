import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

import * as api from "@/lib/api"
import { setAccessToken } from "@/lib/auth/tokenStore"
import type { MembershipRole, SessionOrganization, SessionUser } from "@/lib/api"

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | {
      status: "authenticated"
      user: SessionUser
      organization: SessionOrganization
      role: MembershipRole
    }

interface AuthContextValue {
  state: AuthState
  login: (input: { email: string; password: string }) => Promise<void>
  signup: (input: {
    businessName: string
    name: string
    email: string
    password: string
  }) => Promise<void>
  acceptInvite: (input: { token: string; name: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: SessionUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" })

  useEffect(() => {
    // Silent refresh on load — the httpOnly cookie survives a page reload
    // even though the in-memory access token doesn't (A.7).
    api
      .refresh()
      .then((session) =>
        setState({
          status: "authenticated",
          user: session.user,
          organization: session.organization,
          role: session.role,
        })
      )
      .catch(() => setState({ status: "unauthenticated" }))
  }, [])

  async function login(input: { email: string; password: string }) {
    const session = await api.login(input)
    setAccessToken(session.accessToken)
    setState({
      status: "authenticated",
      user: session.user,
      organization: session.organization,
      role: session.role,
    })
  }

  async function signup(input: {
    businessName: string
    name: string
    email: string
    password: string
  }) {
    const session = await api.signup(input)
    setAccessToken(session.accessToken)
    setState({
      status: "authenticated",
      user: session.user,
      organization: session.organization,
      role: session.role,
    })
  }

  async function acceptInvite(input: { token: string; name: string; password: string }) {
    const session = await api.acceptInvite(input)
    setAccessToken(session.accessToken)
    setState({
      status: "authenticated",
      user: session.user,
      organization: session.organization,
      role: session.role,
    })
  }

  async function logout() {
    await api.logout()
    setState({ status: "unauthenticated" })
  }

  function updateUser(user: SessionUser) {
    setState((prev) => (prev.status === "authenticated" ? { ...prev, user } : prev))
  }

  return (
    <AuthContext.Provider value={{ state, login, signup, acceptInvite, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}

export { AuthProvider, useAuth }
