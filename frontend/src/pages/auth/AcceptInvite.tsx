import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Store } from "lucide-react"

import { AuthCardShell } from "@/components/auth/AuthCardShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { ApiError, getInviteDetails, type MembershipRole } from "@/lib/api"
import { getInitials } from "@/lib/brand"

const schema = z.object({
  name: z.string().trim().min(1, "Your name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type FormValues = z.infer<typeof schema>

interface InviteDetails {
  organizationName: string
  email: string
  role: MembershipRole
}

function OrgHeader({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
        {getInitials(name)}
      </div>
      <span className="text-lg font-semibold text-foreground">{name}</span>
    </div>
  )
}

// Used while loading and on error — no organization to attribute an
// identity badge to yet (or ever, if the token turned out to be invalid).
function GenericHeader() {
  return (
    <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
      <Store className="size-6" />
    </div>
  )
}

function AcceptInvite() {
  const { token } = useParams<{ token: string }>()
  const { acceptInvite } = useAuth()
  const navigate = useNavigate()

  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!token) return
    getInviteDetails(token)
      .then(setInvite)
      .catch((error) =>
        setLoadError(
          error instanceof ApiError ? error.message : "This invite link is invalid or has expired."
        )
      )
  }, [token])

  async function onSubmit(values: FormValues) {
    if (!token) return
    setFormError(null)
    try {
      await acceptInvite({ token, ...values })
      navigate("/", { replace: true })
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Try again.")
    }
  }

  if (loadError) {
    return (
      <AuthCardShell header={<GenericHeader />}>
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-danger">{loadError}</p>
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">
            Back to log in
          </Link>
        </div>
      </AuthCardShell>
    )
  }

  if (!invite) {
    return (
      <AuthCardShell header={<GenericHeader />}>
        <p className="text-center text-sm text-muted-foreground">Loading your invitation…</p>
      </AuthCardShell>
    )
  }

  return (
    <AuthCardShell header={<OrgHeader name={invite.organizationName} />}>
      <div className="mb-6 flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold text-foreground">You're invited!</h1>
        <p className="text-sm text-muted-foreground">
          You've been invited to join <span className="font-medium text-foreground">{invite.organizationName}</span> as
          Staff.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {formError && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Email</label>
          <Input value={invite.email} readOnly disabled />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Your name
          </label>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && <p className="text-sm text-danger">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Joining…" : "Join business"}
        </Button>
      </form>
    </AuthCardShell>
  )
}

export { AcceptInvite }
