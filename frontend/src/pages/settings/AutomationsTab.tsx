import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { AutomationCard } from "@/components/settings/AutomationCard"
import { getAutomationRules, updateAutomationRule, type AutomationRule, type AutomationTrigger } from "@/lib/api"

function AutomationsTab() {
  const [rules, setRules] = useState<AutomationRule[] | null>(null)

  useEffect(() => {
    getAutomationRules().then(setRules)
  }, [])

  if (!rules) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  function findRule(trigger: AutomationTrigger): AutomationRule {
    return rules!.find((r) => r.trigger === trigger)!
  }

  async function save(trigger: AutomationTrigger, input: Parameters<typeof updateAutomationRule>[1]) {
    const updated = await updateAutomationRule(trigger, input)
    setRules((prev) => prev!.map((r) => (r.trigger === trigger ? updated : r)))
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <AutomationCard
        title="Low-stock alert"
        description="Notify me when a product runs low."
        rule={findRule("LOW_STOCK")}
        onSave={(input) => save("LOW_STOCK", input)}
      />

      <AutomationCard
        title="Debt reminder"
        description="Remind me about customers who owe money."
        rule={findRule("DEBT_OVERDUE")}
        onSave={(input) => save("DEBT_OVERDUE", input)}
        renderExtraFields={(config, setConfig) => (
          <div className="flex max-w-xs flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Remind when balance is older than</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                step="1"
                className="w-24"
                value={config.daysOverdue ?? 14}
                onChange={(e) => setConfig({ ...config, daysOverdue: Number(e.target.value) })}
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>
        )}
      />

      <AutomationCard
        title="Daily sales summary"
        description="Send me yesterday's numbers each morning."
        rule={findRule("SCHEDULE")}
        onSave={(input) => save("SCHEDULE", input)}
        renderExtraFields={(config, setConfig) => (
          <div className="flex max-w-xs flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Send time</label>
            <Input
              type="time"
              className="w-32"
              value={config.sendTime ?? "07:00"}
              onChange={(e) => setConfig({ ...config, sendTime: e.target.value })}
            />
          </div>
        )}
      />
    </div>
  )
}

export { AutomationsTab }
