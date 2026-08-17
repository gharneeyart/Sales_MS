import { Button } from "@/components/ui/button"
import { getInitials } from "@/lib/brand"

interface BrandPreviewCardProps {
  displayName: string
  logoUrl: string | null
  primaryColor: string
  accentColor: string
}

function BrandPreviewCard({ displayName, logoUrl, primaryColor, accentColor }: BrandPreviewCardProps) {
  const name = displayName.trim() || "Your Business"

  return (
    <div
      className="rounded-xl border border-border bg-muted/30 p-4"
      style={
        {
          "--primary": primaryColor,
          "--primary-foreground": "#ffffff",
          "--accent": accentColor,
          "--accent-foreground": "#ffffff",
        } as React.CSSProperties
      }
    >
      <p className="mb-3 text-xs font-medium text-muted-foreground">Live preview</p>
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="size-6 rounded-md object-cover" />
          ) : (
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-[10px] font-semibold text-primary-foreground">
              {getInitials(name)}
            </div>
          )}
          <span className="truncate text-sm font-semibold text-card-foreground">{name}</span>
        </div>
        <div className="flex flex-col items-start gap-3 p-4">
          <Button size="sm">Sample button</Button>
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
            Active
          </span>
        </div>
      </div>
    </div>
  )
}

export { BrandPreviewCard }
