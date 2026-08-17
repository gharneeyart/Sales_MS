import { getInitials } from "@/lib/brand"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useBrand } from "@/contexts/BrandContext"

function BrandMark({ className }: { className?: string }) {
  const { state } = useAuth()
  const { brand } = useBrand()
  if (state.status !== "authenticated") return null

  const displayName = brand?.displayName ?? state.organization.name

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      {brand?.logoUrl ? (
        <img src={brand.logoUrl} alt={displayName} className="size-8 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          {getInitials(displayName)}
        </div>
      )}
      <span className="hidden truncate text-base font-semibold text-foreground sm:block">
        {displayName}
      </span>
    </div>
  )
}

export { BrandMark }
