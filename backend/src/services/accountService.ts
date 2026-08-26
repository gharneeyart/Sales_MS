import { User } from "../db/models"
import { hashPassword, verifyPassword } from "../auth/password"
import { HttpError } from "../errors"

export async function updateProfile(userId: string, name: string) {
  const user = await User.findByPk(userId)
  if (!user) throw new HttpError("User not found", 404)

  user.name = name
  await user.save()
  return { id: user.id, name: user.name, email: user.email }
}

export async function updateEmail(userId: string, input: { email: string; currentPassword: string }) {
  const user = await User.findByPk(userId)
  if (!user) throw new HttpError("User not found", 404)

  const valid = await verifyPassword(input.currentPassword, user.passwordHash)
  if (!valid) throw new HttpError("Current password is incorrect", 401)

  const email = input.email.toLowerCase()
  const existing = await User.findOne({ where: { email } })
  if (existing && existing.id !== user.id) {
    throw new HttpError("An account with this email already exists", 409)
  }

  user.email = email
  await user.save()
  return { id: user.id, name: user.name, email: user.email }
}

export async function updatePassword(
  userId: string,
  input: { currentPassword: string; newPassword: string }
) {
  const user = await User.findByPk(userId)
  if (!user) throw new HttpError("User not found", 404)

  const valid = await verifyPassword(input.currentPassword, user.passwordHash)
  if (!valid) throw new HttpError("Current password is incorrect", 401)

  user.passwordHash = await hashPassword(input.newPassword)
  await user.save()
}
