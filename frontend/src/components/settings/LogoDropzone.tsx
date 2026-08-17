import { useRef, useState } from "react"
import { ImageUp, Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_BYTES = 2 * 1024 * 1024

interface LogoDropzoneProps {
  logoUrl: string | null
  uploading: boolean
  onUpload: (file: File) => void
  onRemove: () => void
}

function LogoDropzone({ logoUrl, uploading, onUpload, onRemove }: LogoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFile(file: File | undefined) {
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Logo must be a PNG, JPG, or WebP image")
      return
    }
    if (file.size > MAX_BYTES) {
      setError("Logo must be 2MB or smaller")
      return
    }
    setError(null)
    onUpload(file)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">Logo</label>

      {logoUrl ? (
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Current logo" className="size-14 rounded-lg border border-border object-cover" />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onRemove}>
              <X className="size-3.5" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFile(e.dataTransfer.files[0])
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center transition-colors hover:bg-muted",
            dragOver && "border-primary bg-primary/5"
          )}
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          ) : (
            <ImageUp className="size-6 text-muted-foreground" />
          )}
          <p className="text-sm text-foreground">
            <span className="font-medium text-primary">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">PNG, JPG, or WebP — up to 2MB</p>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ""
        }}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}

export { LogoDropzone }
