import type { ComponentType } from "react"
import { Construction } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/empty-state"

interface PlaceholderPageProps {
  title: string
  description: string
  icon?: ComponentType<{ className?: string }>
  phase: string
}

function PlaceholderPage({ title, description, icon, phase }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={icon ?? Construction}
        title={`${title} lands in ${phase}`}
        description="This screen is scaffolded on the same design system as the rest of the app, ready to be built out."
      />
    </>
  )
}

export { PlaceholderPage }
