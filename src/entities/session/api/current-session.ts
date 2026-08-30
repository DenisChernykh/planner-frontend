import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query'

import {
  authControllerMe,
  clearCsrfToken,
  getAuthControllerMeQueryKey,
  type AuthenticatedPrincipalResponseDto,
} from '@/shared/api'

export const currentSessionQueryKey = getAuthControllerMeQueryKey()
const sessionLoadTails = new WeakMap<QueryClient, Promise<void>>()

function reserveSessionLoad(queryClient: QueryClient) {
  const previous = sessionLoadTails.get(queryClient) ?? Promise.resolve()
  let releaseTurn!: () => void
  const turn = new Promise<void>((resolve) => {
    releaseTurn = resolve
  })
  const tail = previous.catch(() => undefined).then(() => turn)
  sessionLoadTails.set(queryClient, tail)

  return {
    previous: previous.catch(() => undefined),
    release() {
      releaseTurn()
      void tail.then(() => {
        if (sessionLoadTails.get(queryClient) === tail) {
          sessionLoadTails.delete(queryClient)
        }
      })
    },
  }
}

async function waitForSessionLoadTurn(
  previous: Promise<void>,
  signal: AbortSignal,
) {
  signal.throwIfAborted()
  let rejectOnAbort!: (reason: unknown) => void
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectOnAbort = reject
  })
  const handleAbort = () => rejectOnAbort(signal.reason)
  signal.addEventListener('abort', handleAbort, { once: true })
  try {
    await Promise.race([previous, aborted])
  } finally {
    signal.removeEventListener('abort', handleAbort)
  }
  signal.throwIfAborted()
}

const currentSessionQueryOptions = queryOptions({
  queryKey: currentSessionQueryKey,
  queryFn: ({ signal }) => authControllerMe(undefined, signal),
  refetchOnMount: false,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
  staleTime: Number.POSITIVE_INFINITY,
})

/**
 * Performs the fresh session check used by an auth decision.
 *
 * Cached session data is presentation-only and is never accepted as proof of
 * the current cookie. An aborted load leaves the previous principal cache
 * untouched.
 */
export async function loadCurrentSession(
  queryClient: QueryClient,
  signal: AbortSignal,
  options: Readonly<{ onPrincipalChange?: () => void }> = {},
): Promise<AuthenticatedPrincipalResponseDto> {
  const reservation = reserveSessionLoad(queryClient)
  try {
    await waitForSessionLoadTurn(reservation.previous, signal)
    const session = await authControllerMe(undefined, signal)
    signal.throwIfAborted()
    const previousSession =
      queryClient.getQueryData<AuthenticatedPrincipalResponseDto>(
        currentSessionQueryKey,
      )
    if (
      previousSession !== undefined &&
      (previousSession.sessionId !== session.sessionId ||
        previousSession.userId !== session.userId)
    ) {
      options.onPrincipalChange?.()
      clearCsrfToken()
      queryClient.clear()
    }
    queryClient.setQueryData(currentSessionQueryKey, session)
    return session
  } finally {
    reservation.release()
  }
}

/** Returns the active session query for presentation, not for route access. */
export function useCurrentSession() {
  return useQuery(currentSessionQueryOptions)
}

/** Clears every private cache entry and advances the in-memory CSRF generation. */
export function clearCurrentSession(queryClient: QueryClient) {
  clearCsrfToken()
  queryClient.clear()
}
