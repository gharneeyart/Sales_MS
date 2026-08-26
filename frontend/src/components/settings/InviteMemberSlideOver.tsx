import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { SlideOver } from "@/components/ui/slide-over"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ApiError, inviteMember, type TeamMember } from "@/lib/api"

const schema = z.object({
  email: z.email("Enter a valid email address"),
})

type FormValues = z.infer<typeof schema>

interface InviteMemberSlideOverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvited: (invite: TeamMember) => void
}

function InviteMemberSlideOver({ open, onOpenChange, onInvited }: InviteMemberSlideOverProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "" } })

  async function onSubmit(values: FormValues) {
    try {
      const { invite } = await inviteMember(values.email)
      toast.success(`Invite sent to ${values.email}`)
      reset({ email: "" })
      onInvited(invite)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't send invite")
    }
  }

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title="Invite member"
      description="They'll get a link to set up their account."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="invite-member-form" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send invite"}
          </Button>
        </>
      }
    >
      <form id="invite-member-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <Input
            id="invite-email"
            type="email"
            placeholder="colleague@business.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Role</label>
          <Select value="STAFF" disabled>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STAFF">Staff</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            New members join as Staff — you can promote them to Owner afterward.
          </p>
        </div>
      </form>
    </SlideOver>
  )
}

export { InviteMemberSlideOver }
