import { loginPath } from './paths'
import { sanitizeReturnTo } from './return-to'

/** Builds a login URL from a protected pathname only. */
export function loginPathWithReturnTo(returnTo: string) {
  const safeReturnTo = sanitizeReturnTo(returnTo)
  if (safeReturnTo === null) return loginPath
  const params = new URLSearchParams({ returnTo: safeReturnTo })
  return `${loginPath}?${params.toString()}`
}
