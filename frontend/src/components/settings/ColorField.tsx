import { Input } from "@/components/ui/input"

const HEX_RE = /^#[0-9a-fA-F]{6}$/

interface ColorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
}

function ColorField({ label, value, onChange, error }: ColorFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={HEX_RE.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} swatch`}
          className="size-9 shrink-0 cursor-pointer rounded-lg border border-input bg-transparent p-1"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          className="uppercase"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}

export { ColorField }
