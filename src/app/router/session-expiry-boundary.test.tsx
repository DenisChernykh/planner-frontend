import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'

import { clearCurrentSession, currentSessionQueryKey } from '@/entities/session'
import { ApiProblemError } from '@/shared/api'
import {
  beginProtectedSessionExit,
  markFreshProtectedSessionDecision,
  ProtectedSessionTransitionProvider,
  useProtectedSessionTransition,
} from '@/shared/lib/protected-session'
import { clearReturnTo, loginPath, rootPath } from '@/shared/routes'

import { SessionExpiryBoundary } from './session-expiry-boundary'
import {
  createRedirectAuthenticatedLoader,
  createRequireSessionLoader,
} from './session-loaders'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

function authenticationRequired() {
  return new ApiProblemError(
    {
      code: 'AUTHENTICATION_REQUIRED',
      detail: 'Raw private authentication detail',
      instance: 'urn:request:session-expiry-boundary',
      requestId: 'session-expiry-boundary',
      status: 401,
      title: 'Raw private authentication title',
      type: 'https://planner.example.test/problems/authentication-required',
    },
    null,
  )
}

function ProtectedMarker() {
  const { isExiting } = useProtectedSessionTransition()
  return isExiting ? (
    <p role="status">Protected transition</p>
  ) : (
    <p>Private marker</p>
  )
}

function ProtectedRoute() {
  return (
    <ProtectedSessionTransitionProvider>
      <SessionExpiryBoundary>
        <ProtectedMarker />
      </SessionExpiryBoundary>
    </ProtectedSessionTransitionProvider>
  )
}

function setup() {
  markFreshProtectedSessionDecision()
  const publicDestination = deferred()
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  queryClient.setQueryData(currentSessionQueryKey, {
    sessionId: 'abcdefghijklmnopqrstuv',
    userId: '11111111-1111-4111-8111-111111111111',
  })
  queryClient.setQueryData(['private', 'marker'], { visible: true })

  const router = createMemoryRouter(
    [
      { path: '/settings', element: <ProtectedRoute /> },
      {
        path: loginPath,
        loader: async () => {
          await publicDestination.promise
          return null
        },
        element: <p>Public destination</p>,
      },
    ],
    { initialEntries: ['/settings?raw=hidden#private'] },
  )

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { publicDestination, queryClient, router }
}

function setupDurableRecovery() {
  markFreshProtectedSessionDecision()
  const protectedSession = deferred()
  const events: string[] = []
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  const replacementSession = {
    sessionId: 'replacement-session-value',
    userId: '22222222-2222-4222-8222-222222222222',
  }
  queryClient.setQueryData(currentSessionQueryKey, {
    sessionId: 'abcdefghijklmnopqrstuv',
    userId: '11111111-1111-4111-8111-111111111111',
  })

  const clear = () => clearCurrentSession(queryClient)
  const publicLoader = createRedirectAuthenticatedLoader({
    beginExit: beginProtectedSessionExit,
    clear,
    load: async () => {
      events.push('public session')
      queryClient.setQueryData(currentSessionQueryKey, replacementSession)
      return replacementSession
    },
  })
  const protectedLoader = createRequireSessionLoader({
    beginExit: beginProtectedSessionExit,
    clear,
    confirmAccess: markFreshProtectedSessionDecision,
    load: async (signal) => {
      events.push('protected session')
      await protectedSession.promise
      signal.throwIfAborted()
      queryClient.setQueryData(currentSessionQueryKey, replacementSession)
      return replacementSession
    },
  })
  const router = createMemoryRouter(
    [
      { path: '/settings', element: <ProtectedRoute /> },
      {
        path: loginPath,
        loader: publicLoader,
        element: <p>Public destination</p>,
      },
      {
        path: rootPath,
        loader: protectedLoader,
        element: <ProtectedRoute />,
      },
    ],
    { initialEntries: ['/settings'] },
  )

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return {
    events,
    protectedSession,
    queryClient,
    router,
  }
}

async function triggerAuthenticationLoss(
  kind: 'mutation' | 'query',
  queryClient: QueryClient,
) {
  if (kind === 'query') {
    await queryClient
      .fetchQuery({
        queryKey: ['protected', 'query'],
        queryFn: async () => {
          throw authenticationRequired()
        },
      })
      .catch(() => undefined)
    return
  }

  const mutation = queryClient.getMutationCache().build(queryClient, {
    mutationKey: ['protectedMutation'],
    mutationFn: async () => {
      throw authenticationRequired()
    },
  })
  await mutation.execute(undefined).catch(() => undefined)
}

describe('SessionExpiryBoundary', () => {
  it.each(['query', 'mutation'] as const)(
    'hides private UI immediately while the safe login navigation from a %s 401 is pending',
    async (kind) => {
      const { publicDestination, queryClient, router } = setup()
      expect(screen.getByText('Private marker')).toBeVisible()
      sessionStorage.setItem('planner.return-to.v1', '/plans')

      await act(async () => {
        await triggerAuthenticationLoss(kind, queryClient)
      })

      expect(screen.queryByText('Private marker')).not.toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent(
        'Protected transition',
      )
      expect(router.state.navigation.location?.pathname).toBe(loginPath)
      expect(router.state.navigation.location?.search).toBe(
        '?returnTo=%2Fsettings',
      )
      expect(sessionStorage.getItem('planner.return-to.v1')).toBeNull()
      expect(queryClient.getQueryData(['private', 'marker'])).toBeUndefined()
      expect(document.body).not.toHaveTextContent('Raw private')

      await act(async () => publicDestination.resolve())
      expect(await screen.findByText('Public destination')).toBeVisible()
      expect(router.state.location.pathname).toBe(loginPath)
      expect(router.state.location.search).toBe('?returnTo=%2Fsettings')
    },
  )

  it('does not replace an explicit logout navigation with a returnTo redirect', async () => {
    const { publicDestination, queryClient, router } = setup()
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationKey: ['authControllerLogout'],
      mutationFn: async () => {
        throw authenticationRequired()
      },
      onError: () => {
        clearReturnTo(sessionStorage)
        clearCurrentSession(queryClient)
        void router.navigate(loginPath, { replace: true })
      },
    })

    await act(async () => {
      await mutation.execute(undefined).catch(() => undefined)
    })

    expect(router.state.navigation.location?.pathname).toBe(loginPath)
    expect(router.state.navigation.location?.search).toBe('')

    await act(async () => publicDestination.resolve())
    expect(await screen.findByText('Public destination')).toBeVisible()
    expect(router.state.location.pathname).toBe(loginPath)
    expect(router.state.location.search).toBe('')
  })

  it('recovers from exit only after an active public session reaches a fresh protected decision', async () => {
    const { events, protectedSession, queryClient, router } =
      setupDurableRecovery()
    expect(screen.getByText('Private marker')).toBeVisible()

    await act(async () => {
      await triggerAuthenticationLoss('query', queryClient)
    })

    expect(screen.queryByText('Private marker')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Protected transition')
    await waitFor(() =>
      expect(events).toEqual(['public session', 'protected session']),
    )
    expect(screen.queryByText('Private marker')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Protected transition')

    await act(async () => protectedSession.resolve())
    expect(await screen.findByText('Private marker')).toBeVisible()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('Public destination')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe(rootPath)
  })

  it('hides mounted private UI when a public loader confirms anonymous state', async () => {
    markFreshProtectedSessionDecision()
    const destination = deferred()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(['private', 'marker'], { visible: true })
    const publicLoader = createRedirectAuthenticatedLoader({
      beginExit: beginProtectedSessionExit,
      clear: () => clearCurrentSession(queryClient),
      load: async () => {
        throw authenticationRequired()
      },
    })
    const router = createMemoryRouter(
      [
        { path: '/settings', element: <ProtectedRoute /> },
        {
          path: loginPath,
          loader: publicLoader,
          element: <Outlet />,
          children: [
            {
              index: true,
              loader: async () => destination.promise,
              element: <p>Public destination</p>,
            },
          ],
        },
      ],
      { initialEntries: ['/settings'] },
    )
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    expect(screen.getByText('Private marker')).toBeVisible()
    act(() => {
      void router.navigate(loginPath)
    })

    expect(await screen.findByText('Protected transition')).toBeVisible()
    expect(screen.queryByText('Private marker')).toBeNull()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(router.state.navigation.location?.pathname).toBe(loginPath)

    await act(async () => destination.resolve())
    expect(await screen.findByText('Public destination')).toBeVisible()
  })
})
