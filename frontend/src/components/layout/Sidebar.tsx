import { NavLink } from "react-router-dom"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { NAV_ITEMS } from "./nav-items"

interface SidebarProps {
  collapsed?: boolean
  onNavigate?: () => void
}

function Sidebar({ collapsed = false, onNavigate }: SidebarProps) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const link = (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                collapsed && "justify-center px-2",
                isActive &&
                  "bg-sidebar-primary/10 text-sidebar-primary hover:bg-sidebar-primary/10 hover:text-sidebar-primary"
              )
            }
          >
            <item.icon className="size-5 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        )

        if (!collapsed) return link

        return (
          <Tooltip key={item.to}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        )
      })}
    </nav>
  )
}

export { Sidebar }
