import { redirect, type LoaderFunction } from 'react-router'

import { isProblemCode } from '@/shared/api'
import {
  loginPath,
  loginPathWithReturnTo,
  rootPath,
  sanitizeReturnTo,
} from '@/shared/routes'

type SessionLoaderDependencies = Readonly<{
  clear: () => void
  load: (signal: AbortSignal, request: Request) => Promise<unknown>
}>

type ExitSessionLoaderDependencies = SessionLoaderDependencies &
  Readonly<{ beginExit: () => void }>

type ProtectedSessionLoaderDependencies = ExitSessionLoaderDependencies &
  Readonly<{
    confirmAccess: () => void
  }>

function getSafeLoginPath(request: Request) {
  const pathname = sanitizeReturnTo(new URL(request.url).pathname)
  return pathname === null ? loginPath : loginPathWithReturnTo(pathname)
}

/** Starter-derived loader requiring a fresh session for protected routes. */
export function createRequireSessionLoader({
  beginExit,
  clear,
  confirmAccess,
  load,
}: ProtectedSessionLoaderDependencies): LoaderFunction {
  return async ({ request }) => {
    try {
      await load(request.signal, request)
      request.signal.throwIfAborted()
      confirmAccess()
      return null
    } catch (error) {
      if (request.signal.aborted) throw error
      if (!isProblemCode(error, 'AUTHENTICATION_REQUIRED')) throw error

      beginExit()
      clear()
      throw redirect(getSafeLoginPath(request))
    }
  }
}

/** Starter-derived loader redirecting authenticated users from public auth. */
export function createRedirectAuthenticatedLoader({
  beginExit,
  clear,
  load,
}: ExitSessionLoaderDependencies): LoaderFunction {
  return async ({ request }) => {
    let authenticated = false
    try {
      await load(request.signal, request)
      authenticated = true
    } catch (error) {
      if (request.signal.aborted) throw error
      if (!isProblemCode(error, 'AUTHENTICATION_REQUIRED')) throw error
      beginExit()
      clear()
    }
    return authenticated ? redirect(rootPath) : null
  }
}
