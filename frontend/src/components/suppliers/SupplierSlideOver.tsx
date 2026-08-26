import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { SlideOver } from "@/components/ui/slide-over"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ApiError, createSupplier, updateSupplier, type Supplier } from "@/lib/api"

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim(),
  notes: z.string().trim(),
})

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = { name: "", phone: "", notes: "" }

interface SupplierSlideOverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier?: Supplier
  onSaved: (supplier: Supplier) => void
}

function SupplierSlideOver({ open, onOpenChange, supplier, onSaved }: SupplierSlideOverProps) {
  const isEdit = !!supplier

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: supplier
      ? { name: supplier.name, phone: supplier.phone ?? "", notes: supplier.notes ?? "" }
      : EMPTY,
  })

  async function onSubmit(values: FormValues) {
    const input = { name: values.name, phone: values.phone || null, notes: values.notes || null }
    try {
      const saved = isEdit ? await updateSupplier(supplier.id, input) : await createSupplier(input)
      toast.success(isEdit ? "Supplier updated" : "Supplier added")
      if (!isEdit) reset(EMPTY)
      onSaved(saved)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save supplier")
    }
  }

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit supplier" : "Add supplier"}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="supplier-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form id="supplier-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="supplier-name" className="text-sm font-medium text-foreground">
            Name
          </label>
          <Input id="supplier-name" aria-invalid={!!errors.name} {...register("name")} />
          {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="supplier-phone" className="text-sm font-medium text-foreground">
            Phone
          </label>
          <Input id="supplier-phone" placeholder="Optional" {...register("phone")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="supplier-notes" className="text-sm font-medium text-foreground">
            Notes
          </label>
          <textarea
            id="supplier-notes"
            rows={4}
            placeholder="Optional"
            className={cn(
              "w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            )}
            {...register("notes")}
          />
        </div>
      </form>
    </SlideOver>
  )
}

export { SupplierSlideOver }
