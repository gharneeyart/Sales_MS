// The access token lives in memory only — never localStorage/sessionStorage
// — so it can't be lifted by an XSS payload reading storage (A.7). The
// refresh token is the httpOnly cookie the browser handles on its own; this
// module never sees it.
let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}
