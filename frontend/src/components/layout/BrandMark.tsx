import { brand, getInitials } from "@/lib/brand"
import { cn } from "@/lib/utils"

function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      {brand.logoUrl ? (
        <img
          src={brand.logoUrl}
          alt={brand.displayName}
          className="size-8 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          {getInitials(brand.displayName)}
        </div>
      )}
      <span className="hidden truncate text-base font-semibold text-foreground sm:block">
        {brand.displayName}
      </span>
    </div>
  )
}

export { BrandMark }
