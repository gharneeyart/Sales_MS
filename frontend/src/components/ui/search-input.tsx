import * as React from "react"
import { SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function SearchInput({
  className,
  containerClassName,
  placeholder = "Search…",
  ...props
}: React.ComponentProps<"input"> & { containerClassName?: string }) {
  return (
    <div className={cn("relative w-full", containerClassName)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        data-slot="search-input"
        placeholder={placeholder}
        className={cn(
          "h-9 w-full rounded-lg border border-input bg-transparent py-1 pr-3 pl-8 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "[&::-webkit-search-cancel-button]:appearance-none",
          className
        )}
        {...props}
      />
    </div>
  )
}

export { SearchInput }
