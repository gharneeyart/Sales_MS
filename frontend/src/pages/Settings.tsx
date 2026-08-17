import { Users, Zap, CreditCard, UserCircle, History } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/ui/empty-state"
import { BrandingTab } from "@/pages/settings/BrandingTab"

function ComingSoon({ icon, title }: { icon: typeof Users; title: string }) {
  return (
    <EmptyState
      icon={icon}
      title={`${title} lands in a later phase`}
      description="This tab is scaffolded and ready to be built out."
    />
  )
}

function Settings() {
  return (
    <>
      <PageHeader title="Settings" description="Manage how your business appears and operates." />

      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="activity">Activity log</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="mt-6">
          <BrandingTab />
        </TabsContent>
        <TabsContent value="team" className="mt-6">
          <ComingSoon icon={Users} title="Team" />
        </TabsContent>
        <TabsContent value="automations" className="mt-6">
          <ComingSoon icon={Zap} title="Automations" />
        </TabsContent>
        <TabsContent value="billing" className="mt-6">
          <ComingSoon icon={CreditCard} title="Billing" />
        </TabsContent>
        <TabsContent value="account" className="mt-6">
          <ComingSoon icon={UserCircle} title="Account" />
        </TabsContent>
        <TabsContent value="activity" className="mt-6">
          <ComingSoon icon={History} title="Activity log" />
        </TabsContent>
      </Tabs>
    </>
  )
}

export { Settings }
