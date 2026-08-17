import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

import * as api from "@/lib/api"
import type { BrandSettings } from "@/lib/api"
import { useAuth } from "./AuthContext"

interface BrandContextValue {
  brand: BrandSettings | null
  update: (input: { displayName: string; primaryColor: string; accentColor: string }) => Promise<void>
  uploadLogo: (file: File) => Promise<void>
  removeLogo: () => Promise<void>
  reset: () => Promise<void>
}

const BrandContext = createContext<BrandContextValue | null>(null)

function applyTheme(brand: BrandSettings) {
  document.documentElement.style.setProperty("--primary", brand.primaryColor)
  document.documentElement.style.setProperty("--accent", brand.accentColor)
}

function BrandProvider({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  const [brand, setBrand] = useState<BrandSettings | null>(null)

  useEffect(() => {
    if (state.status !== "authenticated") {
      setBrand(null)
      return
    }
    api.getBranding().then((b) => {
      setBrand(b)
      applyTheme(b)
    })
  }, [state.status])

  async function update(input: { displayName: string; primaryColor: string; accentColor: string }) {
    const b = await api.updateBranding(input)
    setBrand(b)
    applyTheme(b)
  }

  async function uploadLogo(file: File) {
    setBrand(await api.uploadLogo(file))
  }

  async function removeLogo() {
    setBrand(await api.removeLogo())
  }

  async function reset() {
    const b = await api.resetBranding()
    setBrand(b)
    applyTheme(b)
  }

  return (
    <BrandContext.Provider value={{ brand, update, uploadLogo, removeLogo, reset }}>
      {children}
    </BrandContext.Provider>
  )
}

function useBrand() {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error("useBrand must be used within a BrandProvider")
  return ctx
}

export { BrandProvider, useBrand }
