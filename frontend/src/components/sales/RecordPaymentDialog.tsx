import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatKobo, koboToNaira, nairaToKobo } from "@/lib/format"
import { ApiError, recordPayment, type PaymentMethod, type SaleDetail } from "@/lib/api"

const schema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  method: z.enum(["CASH", "TRANSFER", "POS", "OTHER"]),
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "POS", label: "POS" },
  { value: "OTHER", label: "Other" },
]

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  saleId: string
  balance: number
  onRecorded: (sale: SaleDetail) => void
}

function RecordPaymentDialog({ open, onOpenChange, saleId, balance, onRecorded }: RecordPaymentDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    values: { amount: koboToNaira(balance), method: "CASH" },
  })

  async function onSubmit(values: FormValues) {
    try {
      const sale = await recordPayment(saleId, { amount: nairaToKobo(values.amount), method: values.method })
      toast.success("Payment recorded")
      onRecorded(sale)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't record payment")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="text-sm text-muted-foreground">Outstanding balance</p>
          <p className="text-2xl font-semibold text-foreground">{formatKobo(balance)}</p>
        </div>

        <form id="payment-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="payment-amount" className="text-sm font-medium text-foreground">
              Amount (₦)
            </label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0"
              aria-invalid={!!errors.amount}
              {...register("amount")}
            />
            {errors.amount && <p className="text-sm text-danger">{errors.amount.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Payment method</label>
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="payment-form" disabled={isSubmitting}>
            {isSubmitting ? "Recording…" : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { RecordPaymentDialog }
