import { useState } from "react"
import { Calendar, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/format"

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const PRESETS: { label: string; range: () => { from: Date; to: Date } }[] = [
  { label: "Today", range: () => ({ from: startOfDay(new Date()), to: new Date() }) },
  {
    label: "Last 7 days",
    range: () => ({ from: startOfDay(new Date(Date.now() - 7 * 86400000)), to: new Date() }),
  },
  {
    label: "Last 30 days",
    range: () => ({ from: startOfDay(new Date(Date.now() - 30 * 86400000)), to: new Date() }),
  },
  {
    label: "Last 90 days",
    range: () => ({ from: startOfDay(new Date(Date.now() - 90 * 86400000)), to: new Date() }),
  },
  {
    label: "Month to date",
    range: () => {
      const now = new Date()
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
    },
  },
]

interface DateRangePickerProps {
  from: Date
  to: Date
  presetLabel: string | null
  onChange: (from: Date, to: Date, presetLabel: string | null) => void
}

function DateRangePicker({ from, to, presetLabel, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState(toDateInputValue(from))
  const [customTo, setCustomTo] = useState(toDateInputValue(to))

  function selectPreset(preset: (typeof PRESETS)[number]) {
    const range = preset.range()
    onChange(range.from, range.to, preset.label)
    setOpen(false)
  }

  function applyCustom() {
    const parsedFrom = new Date(customFrom)
    const parsedTo = new Date(`${customTo}T23:59:59`)
    onChange(parsedFrom, parsedTo, null)
    setOpen(false)
  }

  const label = presetLabel ?? `${formatDate(from)} – ${formatDate(to)}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Calendar className="size-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="p-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => selectPreset(preset)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
                presetLabel === preset.label && "font-medium text-foreground"
              )}
            >
              {preset.label}
              {presetLabel === preset.label && <Check className="size-4 text-primary" />}
            </button>
          ))}
        </div>
        <div className="border-t border-border p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Custom range</p>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 text-xs"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <Button size="sm" className="mt-2 w-full" onClick={applyCustom}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DateRangePicker, PRESETS }
