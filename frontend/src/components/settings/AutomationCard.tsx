import { useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ApiError, type AutomationConfig, type AutomationRule } from "@/lib/api"

interface AutomationCardProps {
  title: string
  description: string
  rule: AutomationRule
  onSave: (input: { enabled: boolean; config: AutomationConfig }) => Promise<void>
  renderExtraFields?: (config: AutomationConfig, setConfig: (config: AutomationConfig) => void) => ReactNode
}

function AutomationCard({ title, description, rule, onSave, renderExtraFields }: AutomationCardProps) {
  const [enabled, setEnabled] = useState(rule.enabled)
  const [config, setConfig] = useState<AutomationConfig>(rule.config)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEnabled(rule.enabled)
    setConfig(rule.config)
  }, [rule])

  const dirty = enabled !== rule.enabled || JSON.stringify(config) !== JSON.stringify(rule.config)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({ enabled, config })
      toast.success(`${title} saved`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </CardHeader>

      {enabled && (
        <CardContent className="flex flex-col gap-4">
          {renderExtraFields?.(config, setConfig)}

          <div className="flex max-w-xs flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Notify by</label>
            <Select
              value={config.channel}
              onValueChange={(value) => setConfig({ ...config, channel: value as AutomationConfig["channel"] })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      )}

      <CardFooter>
        <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </CardFooter>
    </Card>
  )
}

export { AutomationCard }
