import { PageHeader } from "@/components/layout/PageHeader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BrandingTab } from "@/pages/settings/BrandingTab"
import { AutomationsTab } from "@/pages/settings/AutomationsTab"
import { TeamTab } from "@/pages/settings/TeamTab"
import { BillingTab } from "@/pages/settings/BillingTab"
import { AccountTab } from "@/pages/settings/AccountTab"
import { ActivityLogTab } from "@/pages/settings/ActivityLogTab"

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
          <TeamTab />
        </TabsContent>
        <TabsContent value="automations" className="mt-6">
          <AutomationsTab />
        </TabsContent>
        <TabsContent value="billing" className="mt-6">
          <BillingTab />
        </TabsContent>
        <TabsContent value="account" className="mt-6">
          <AccountTab />
        </TabsContent>
        <TabsContent value="activity" className="mt-6">
          <ActivityLogTab />
        </TabsContent>
      </Tabs>
    </>
  )
}

export { Settings }
