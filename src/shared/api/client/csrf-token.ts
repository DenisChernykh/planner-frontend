let csrfToken: string | null = null
let csrfGeneration = 0
let csrfGenerationAbortController = new AbortController()

type PendingCsrfToken = {
  generation: number
  invalidate: () => void
  promise: Promise<CsrfTokenLease>
}

let pendingCsrfToken: PendingCsrfToken | null = null

export type CsrfTokenLease = Readonly<{
  read: () => string
  signal: AbortSignal
}>

function createGenerationAbort() {
  return new DOMException(
    'CSRF token fetch was invalidated by a session generation change',
    'AbortError',
  )
}

function invalidatePendingCsrfToken() {
  const pending = pendingCsrfToken
  pendingCsrfToken = null
  // Reject instead of refetching: pre-boundary unsafe requests must not be
  // released automatically into a cleared or replacement session.
  pending?.invalidate()
}

function createCsrfTokenLease(
  token: string,
  generation: number,
  signal: AbortSignal,
): CsrfTokenLease {
  return Object.freeze({
    read() {
      if (generation !== csrfGeneration || csrfToken !== token) {
        throw createGenerationAbort()
      }
      return token
    },
    signal,
  })
}

function advanceCsrfGeneration() {
  const previousGeneration = csrfGenerationAbortController
  csrfGeneration += 1
  csrfGenerationAbortController = new AbortController()
  previousGeneration.abort(createGenerationAbort())
}

export function peekCsrfToken() {
  return csrfToken
}

export function setCsrfToken(token: string) {
  advanceCsrfGeneration()
  csrfToken = token
  invalidatePendingCsrfToken()
}

export function clearCsrfToken() {
  advanceCsrfGeneration()
  csrfToken = null
  invalidatePendingCsrfToken()
}

export async function getOrFetchCsrfTokenLease(
  fetcher: () => Promise<string>,
): Promise<CsrfTokenLease> {
  if (csrfToken !== null) {
    return createCsrfTokenLease(
      csrfToken,
      csrfGeneration,
      csrfGenerationAbortController.signal,
    )
  }
  if (pendingCsrfToken !== null) return pendingCsrfToken.promise

  let resolvePending!: (lease: CsrfTokenLease) => void
  let rejectPending!: (error: unknown) => void
  const promise = new Promise<CsrfTokenLease>((resolve, reject) => {
    resolvePending = resolve
    rejectPending = reject
  })
  const pending: PendingCsrfToken = {
    generation: csrfGeneration,
    invalidate: () => rejectPending(createGenerationAbort()),
    promise,
  }
  pendingCsrfToken = pending

  let fetchedToken: Promise<string>
  try {
    fetchedToken = fetcher()
  } catch (error) {
    pendingCsrfToken = null
    rejectPending(error)
    return pending.promise
  }

  void fetchedToken
    .then((token) => {
      if (
        pendingCsrfToken !== pending ||
        pending.generation !== csrfGeneration
      ) {
        pending.invalidate()
        return
      }

      csrfToken = token
      resolvePending(
        createCsrfTokenLease(
          token,
          pending.generation,
          csrfGenerationAbortController.signal,
        ),
      )
    })
    .catch((error: unknown) => {
      rejectPending(error)
    })
    .finally(() => {
      if (pendingCsrfToken === pending) pendingCsrfToken = null
    })

  return pending.promise
}
