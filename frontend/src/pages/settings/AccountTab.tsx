import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { LogOut } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { ApiError, updateProfile, updateEmail, updateAccountPassword } from "@/lib/api"

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
})
type ProfileValues = z.infer<typeof profileSchema>

const emailSchema = z.object({
  email: z.email("Enter a valid email address"),
  currentPassword: z.string().min(1, "Current password is required"),
})
type EmailValues = z.infer<typeof emailSchema>

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
type PasswordValues = z.infer<typeof passwordSchema>

function ProfileCard() {
  const { state, updateUser } = useAuth()
  const name = state.status === "authenticated" ? state.user.name : ""

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name },
  })

  async function onSubmit(values: ProfileValues) {
    try {
      const user = await updateProfile(values.name)
      updateUser(user)
      toast.success("Name updated")
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't update name")
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Your name</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="account-name" className="text-sm font-medium text-foreground">
              Name
            </label>
            <Input id="account-name" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-fit">
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function EmailCard() {
  const { state, updateUser } = useAuth()
  const email = state.status === "authenticated" ? state.user.email : ""

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email, currentPassword: "" },
    values: { email, currentPassword: "" },
  })

  async function onSubmit(values: EmailValues) {
    try {
      const user = await updateEmail(values.email, values.currentPassword)
      updateUser(user)
      reset({ email: values.email, currentPassword: "" })
      toast.success("Email updated")
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't update email")
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Email address</CardTitle>
        <CardDescription>Confirm your password to change the email you log in with.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="account-email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input id="account-email" type="email" aria-invalid={!!errors.email} {...register("email")} />
            {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="account-email-password" className="text-sm font-medium text-foreground">
              Current password
            </label>
            <Input
              id="account-email-password"
              type="password"
              aria-invalid={!!errors.currentPassword}
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-sm text-danger">{errors.currentPassword.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-fit">
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function PasswordCard() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  async function onSubmit(values: PasswordValues) {
    try {
      await updateAccountPassword(values.currentPassword, values.newPassword)
      reset({ currentPassword: "", newPassword: "", confirmPassword: "" })
      toast.success("Password updated")
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't update password")
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="account-current-password" className="text-sm font-medium text-foreground">
              Current password
            </label>
            <Input
              id="account-current-password"
              type="password"
              aria-invalid={!!errors.currentPassword}
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-sm text-danger">{errors.currentPassword.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="account-new-password" className="text-sm font-medium text-foreground">
              New password
            </label>
            <Input
              id="account-new-password"
              type="password"
              aria-invalid={!!errors.newPassword}
              {...register("newPassword")}
            />
            {errors.newPassword && <p className="text-sm text-danger">{errors.newPassword.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="account-confirm-password" className="text-sm font-medium text-foreground">
              Confirm new password
            </label>
            <Input
              id="account-confirm-password"
              type="password"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-danger">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-fit">
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function AccountTab() {
  const { logout } = useAuth()

  return (
    <div className="flex flex-col gap-6">
      <ProfileCard />
      <EmailCard />
      <PasswordCard />

      <div className="max-w-lg border-t border-border pt-6">
        <Button variant="ghost" className="text-muted-foreground" onClick={() => logout()}>
          <LogOut className="size-4" />
          Log out
        </Button>
      </div>
    </div>
  )
}

export { AccountTab }
