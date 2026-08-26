import crypto from "node:crypto"

import { env } from "../config/env"
import { HttpError } from "../errors"

const PAYSTACK_BASE_URL = "https://api.paystack.co"

interface InitializeTransactionInput {
  email: string
  amountKobo: number
  reference: string
  callbackUrl: string
  metadata: Record<string, unknown>
}

interface InitializeTransactionResult {
  authorizationUrl: string
  accessCode: string
  reference: string
}

interface PaystackInitializeResponse {
  status: boolean
  message: string
  data: { authorization_url: string; access_code: string; reference: string }
}

export async function initializeTransaction(
  input: InitializeTransactionInput
): Promise<InitializeTransactionResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  })

  const body = (await res.json()) as PaystackInitializeResponse
  if (!res.ok || !body.status) {
    throw new HttpError(body.message ?? "Paystack couldn't start this checkout", 502)
  }

  return {
    authorizationUrl: body.data.authorization_url,
    accessCode: body.data.access_code,
    reference: body.data.reference,
  }
}

/** HMAC-SHA512 of the raw request body, per Paystack's webhook signature scheme. */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!signature) return false
  const expected = crypto.createHmac("sha512", env.paystackSecretKey).update(rawBody).digest("hex")
  const expectedBuf = Buffer.from(expected)
  const signatureBuf = Buffer.from(signature)
  if (expectedBuf.length !== signatureBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, signatureBuf)
}
