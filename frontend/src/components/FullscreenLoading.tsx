import { Loader2 } from "lucide-react"

function FullscreenLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

export { FullscreenLoading }
