import type { ReactNode } from "react"

function AuthCardShell({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        {header}
        <div className="w-full rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}

export { AuthCardShell }
