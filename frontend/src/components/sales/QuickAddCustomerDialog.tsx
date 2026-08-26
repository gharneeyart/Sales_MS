import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ApiError, createCustomer, type Customer } from "@/lib/api"

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim(),
})

type FormValues = z.infer<typeof schema>

interface QuickAddCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (customer: Customer) => void
}

function QuickAddCustomerDialog({ open, onOpenChange, onCreated }: QuickAddCustomerDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", phone: "" } })

  async function onSubmit(values: FormValues) {
    try {
      const customer = await createCustomer({ name: values.name, phone: values.phone || null })
      toast.success("Customer added")
      reset()
      onCreated(customer)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't add customer")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
          <DialogDescription>Quickly add a customer to attach to this sale.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quick-customer-name" className="text-sm font-medium text-foreground">
              Name
            </label>
            <Input id="quick-customer-name" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quick-customer-phone" className="text-sm font-medium text-foreground">
              Phone
            </label>
            <Input id="quick-customer-phone" placeholder="Optional" {...register("phone")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { QuickAddCustomerDialog }
