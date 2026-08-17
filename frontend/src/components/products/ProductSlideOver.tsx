import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { SlideOver } from "@/components/ui/slide-over"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ApiError, createProduct, getProductCategories, updateProduct, type Product } from "@/lib/api"
import { koboToNaira, nairaToKobo } from "@/lib/format"

const schema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  category: z.string().trim(),
  sku: z.string().trim(),
  unitLabel: z.string().trim().min(1, "Unit is required"),
  costPrice: z.coerce.number().min(0, "Cost can't be negative"),
  wholesalePrice: z.coerce.number().min(0, "Wholesale price can't be negative"),
  retailPrice: z.coerce.number().min(0, "Retail price can't be negative"),
  stockQty: z.coerce.number().int("Must be a whole number").min(0, "Stock can't be negative"),
  reorderLevel: z.coerce.number().int("Must be a whole number").min(0, "Reorder level can't be negative"),
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

const EMPTY: FormInput = {
  name: "",
  category: "",
  sku: "",
  unitLabel: "",
  costPrice: 0,
  wholesalePrice: 0,
  retailPrice: 0,
  stockQty: 0,
  reorderLevel: 0,
}

interface ProductSlideOverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product
  onSaved: (product: Product) => void
}

function ProductSlideOver({ open, onOpenChange, product, onSaved }: ProductSlideOverProps) {
  const isEdit = !!product
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    if (open) getProductCategories().then(setCategories)
  }, [open])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    values: product
      ? {
          name: product.name,
          category: product.category ?? "",
          sku: product.sku ?? "",
          unitLabel: product.unitLabel,
          costPrice: koboToNaira(product.costPrice),
          wholesalePrice: koboToNaira(product.wholesalePrice),
          retailPrice: koboToNaira(product.retailPrice),
          stockQty: product.stockQty,
          reorderLevel: product.reorderLevel,
        }
      : EMPTY,
  })

  async function onSubmit(values: FormValues) {
    const input = {
      name: values.name,
      category: values.category || null,
      sku: values.sku || null,
      unitLabel: values.unitLabel,
      costPrice: nairaToKobo(values.costPrice),
      wholesalePrice: nairaToKobo(values.wholesalePrice),
      retailPrice: nairaToKobo(values.retailPrice),
      stockQty: values.stockQty,
      reorderLevel: values.reorderLevel,
    }
    try {
      const saved = isEdit ? await updateProduct(product.id, input) : await createProduct(input)
      toast.success(isEdit ? "Product updated" : "Product added")
      if (!isEdit) reset(EMPTY)
      onSaved(saved)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save product")
    }
  }

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit product" : "Add product"}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Name
          </label>
          <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
          {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="category" className="text-sm font-medium text-foreground">
              Category
            </label>
            <Input id="category" list="category-options" placeholder="e.g. Grains" {...register("category")} />
            <datalist id="category-options">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sku" className="text-sm font-medium text-foreground">
              SKU
            </label>
            <Input id="sku" placeholder="Optional" {...register("sku")} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="unitLabel" className="text-sm font-medium text-foreground">
            Unit
          </label>
          <Input id="unitLabel" placeholder="bag, carton, piece…" aria-invalid={!!errors.unitLabel} {...register("unitLabel")} />
          {errors.unitLabel && <p className="text-sm text-danger">{errors.unitLabel.message}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="costPrice" className="text-sm font-medium text-foreground">
              Cost (₦)
            </label>
            <Input id="costPrice" type="number" step="0.01" min="0" aria-invalid={!!errors.costPrice} {...register("costPrice")} />
            {errors.costPrice && <p className="text-sm text-danger">{errors.costPrice.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="wholesalePrice" className="text-sm font-medium text-foreground">
              Wholesale (₦)
            </label>
            <Input
              id="wholesalePrice"
              type="number"
              step="0.01"
              min="0"
              aria-invalid={!!errors.wholesalePrice}
              {...register("wholesalePrice")}
            />
            {errors.wholesalePrice && <p className="text-sm text-danger">{errors.wholesalePrice.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="retailPrice" className="text-sm font-medium text-foreground">
              Retail (₦)
            </label>
            <Input
              id="retailPrice"
              type="number"
              step="0.01"
              min="0"
              aria-invalid={!!errors.retailPrice}
              {...register("retailPrice")}
            />
            {errors.retailPrice && <p className="text-sm text-danger">{errors.retailPrice.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="stockQty" className="text-sm font-medium text-foreground">
              Current stock
            </label>
            <Input id="stockQty" type="number" step="1" min="0" aria-invalid={!!errors.stockQty} {...register("stockQty")} />
            {errors.stockQty && <p className="text-sm text-danger">{errors.stockQty.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reorderLevel" className="text-sm font-medium text-foreground">
              Reorder level
            </label>
            <Input
              id="reorderLevel"
              type="number"
              step="1"
              min="0"
              aria-invalid={!!errors.reorderLevel}
              {...register("reorderLevel")}
            />
            <p className="text-sm text-muted-foreground">Warn me when stock drops to this</p>
            {errors.reorderLevel && <p className="text-sm text-danger">{errors.reorderLevel.message}</p>}
          </div>
        </div>
      </form>
    </SlideOver>
  )
}

export { ProductSlideOver }
