import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { LogoDropzone } from "@/components/settings/LogoDropzone"
import { ColorField } from "@/components/settings/ColorField"
import { BrandPreviewCard } from "@/components/settings/BrandPreviewCard"
import { useBrand } from "@/contexts/BrandContext"
import { ApiError } from "@/lib/api"

const hexColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Enter a valid hex color, e.g. #2563EB")

const schema = z.object({
  displayName: z.string().trim().min(1, "Business name is required"),
  primaryColor: hexColor,
  accentColor: hexColor,
})

type FormValues = z.infer<typeof schema>

function BrandingTab() {
  const { brand, update, uploadLogo, removeLogo, reset } = useBrand()
  const [uploading, setUploading] = useState(false)
  const [resetting, setResetting] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: "", primaryColor: "", accentColor: "" },
    values: brand
      ? { displayName: brand.displayName, primaryColor: brand.primaryColor, accentColor: brand.accentColor }
      : undefined,
  })

  const draft = watch()

  if (!brand) return null

  async function onSubmit(values: FormValues) {
    try {
      await update(values)
      toast.success("Branding saved")
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save changes")
    }
  }

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      await uploadLogo(file)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't upload logo")
    } finally {
      setUploading(false)
    }
  }

  async function handleRemoveLogo() {
    try {
      await removeLogo()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't remove logo")
    }
  }

  async function handleReset() {
    setResetting(true)
    try {
      await reset()
      toast.success("Reset to default")
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't reset branding")
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="displayName" className="text-sm font-medium text-foreground">
            Business display name
          </label>
          <Input id="displayName" aria-invalid={!!errors.displayName} {...register("displayName")} />
          {errors.displayName && <p className="text-sm text-danger">{errors.displayName.message}</p>}
        </div>

        <LogoDropzone
          logoUrl={brand.logoUrl}
          uploading={uploading}
          onUpload={handleUpload}
          onRemove={handleRemoveLogo}
        />

        <Controller
          control={control}
          name="primaryColor"
          render={({ field }) => (
            <ColorField label="Primary color" value={field.value} onChange={field.onChange} error={errors.primaryColor?.message} />
          )}
        />
        <Controller
          control={control}
          name="accentColor"
          render={({ field }) => (
            <ColorField label="Accent color" value={field.value} onChange={field.onChange} error={errors.accentColor?.message} />
          )}
        />

        <div className="mt-2 flex gap-3">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
          <Button type="button" variant="ghost" onClick={handleReset} disabled={resetting}>
            {resetting ? "Resetting…" : "Reset to default"}
          </Button>
        </div>
      </form>

      <BrandPreviewCard
        displayName={draft.displayName ?? brand.displayName}
        logoUrl={brand.logoUrl}
        primaryColor={draft.primaryColor ?? brand.primaryColor}
        accentColor={draft.accentColor ?? brand.accentColor}
      />
    </div>
  )
}

export { BrandingTab }
