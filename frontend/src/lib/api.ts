const API_URL = import.meta.env.VITE_API_URL as string
const HELLO_API_TOKEN = import.meta.env.VITE_HELLO_API_TOKEN as string

export interface HelloResponse {
  message: string
  dbTime: string
  redisHits: number
}

/** Phase 0 plumbing proof — replaced by the real access-token flow in Phase 1. */
export async function fetchHello(): Promise<HelloResponse> {
  const res = await fetch(`${API_URL}/api/hello`, {
    headers: { Authorization: `Bearer ${HELLO_API_TOKEN}` },
  })
  if (!res.ok) {
    throw new Error(`API responded with ${res.status}`)
  }
  return res.json()
}
