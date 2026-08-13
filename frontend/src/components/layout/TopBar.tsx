import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { BrandMark } from "./BrandMark"
import { UserMenu } from "./UserMenu"

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </Button>

      <BrandMark className="md:w-64" />

      <div className="flex flex-1 justify-center px-2">
        <SearchInput
          containerClassName="max-w-md"
          placeholder="Search sales, products, customers…"
        />
      </div>

      <UserMenu />
    </header>
  )
}

export { TopBar }
