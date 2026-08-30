import { useEffect, useLayoutEffect, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { currentSessionQueryKey } from '@/entities/session'
import { telegramNavigationQueryKey } from '@/entities/telegram-navigation'
import {
  ApiProblemError,
  type AuthenticatedPrincipalResponseDto,
} from '@/shared/api'
import { useOnlineStatus } from '@/shared/lib/online-status'

import { ReconnectRefreshBoundary } from './reconnect-refresh-boundary'

const state = vi.hoisted(() => ({
  beginExit: vi.fn(),
  isOnline: false,
  loadCurrentSession: vi.fn(),
  loadCurrentWorkspace: vi.fn(),
  loadTelegramNavigation: vi.fn(),
  loadTrackingToday: vi.fn(),
  onlineListeners: new Set<() => void>(),
  reconnectVersion: 0,
}))

vi.mock('@/entities/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/session')>()
  return { ...actual, loadCurrentSession: state.loadCurrentSession }
})

vi.mock('@/entities/workspace', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/workspace')>()
  return { ...actual, loadCurrentWorkspace: state.loadCurrentWorkspace }
})

vi.mock('@/entities/tracking', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/tracking')>()
  return { ...actual, loadTrackingToday: state.loadTrackingToday }
})

vi.mock('@/entities/telegram-navigation', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/entities/telegram-navigation')>()
  return { ...actual, loadTelegramNavigation: state.loadTelegramNavigation }
})

vi.mock('@/shared/lib/online-status', async () => {
  const { useSyncExternalStore } = await import('react')
  return {
    useOnlineStatus: () => ({
      isOnline: useSyncExternalStore(
        (listener) => {
          state.onlineListeners.add(listener)
          return () => state.onlineListeners.delete(listener)
        },
        () => state.isOnline,
        () => state.isOnline,
      ),
      reconnectVersion: state.reconnectVersion,
    }),
  }
})

vi.mock('@/shared/lib/protected-session', () => ({
  useProtectedSessionTransition: () => ({
    beginExit: state.beginExit,
    isExiting: false,
  }),
}))

const principalA = {
  sessionId: 'session_for_principal_a',
  userId: '11111111-1111-4111-8111-111111111111',
} satisfies AuthenticatedPrincipalResponseDto

const principalB = {
  sessionId: 'session_for_principal_b',
  userId: '22222222-2222-4222-8222-222222222222',
} satisfies AuthenticatedPrincipalResponseDto

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

function problem(
  status: number,
  code: 'AUTHENTICATION_REQUIRED' | 'DEPENDENCY_UNAVAILABLE',
) {
  return new ApiProblemError(
    {
      code,
      detail: 'Raw reconnect detail',
      instance: 'urn:request:reconnect-test',
      requestId: 'reconnect-test',
      status,
      title: 'Raw reconnect title',
      type: 'https://planner.example.test/problems/reconnect-test',
    },
    null,
  )
}

function mockSuccessfulLoaders(events: string[] = []) {
  state.loadCurrentSession.mockImplementation(async () => {
    events.push('session')
    return principalA
  })
  state.loadCurrentWorkspace.mockImplementation(async () => {
    events.push('workspace')
    return { workspace: 'current' }
  })
  state.loadTrackingToday.mockImplementation(async () => {
    events.push('tracking')
    return { tracking: 'today' }
  })
  state.loadTelegramNavigation.mockImplementation(async () => {
    events.push('telegram')
    return { navigation: 'authenticated' }
  })
}

function ProtectedContent({
  onMount,
  onOnlineCommit,
}: {
  onMount: () => void
  onOnlineCommit: () => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const { isOnline } = useOnlineStatus()

  useEffect(() => {
    onMount()
    heading.current?.focus()
  }, [onMount])

  useLayoutEffect(() => {
    if (isOnline) onOnlineCommit()
  }, [isOnline, onOnlineCommit])

  return (
    <main aria-label="Private shell">
      <h1 ref={heading} tabIndex={-1}>
        Protected content
      </h1>
      <button type="button" disabled={!isOnline}>
        Protected action
      </button>
      <a href="/plans">Protected link</a>
    </main>
  )
}

function setup({
  initialPath = '/today',
  onMount = vi.fn(),
  onOnlineCommit = vi.fn(),
}: {
  initialPath?: string
  onMount?: () => void
  onOnlineCommit?: () => void
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  queryClient.setQueryData(currentSessionQueryKey, principalA)
  queryClient.setQueryData(['private', 'principal-a'], { visible: true })

  const router = createMemoryRouter(
    [
      { path: '/login', element: <p>Login destination</p> },
      {
        path: '*',
        element: (
          <ReconnectRefreshBoundary>
            <ProtectedContent
              onMount={onMount}
              onOnlineCommit={onOnlineCommit}
            />
          </ReconnectRefreshBoundary>
        ),
      },
    ],
    { initialEntries: [initialPath] },
  )
  const navigateSpy = vi.spyOn(router, 'navigate')

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return {
    goOnline() {
      act(() => {
        if (!state.isOnline) state.reconnectVersion += 1
        state.isOnline = true
        state.onlineListeners.forEach((listener) => listener())
      })
    },
    goOffline() {
      act(() => {
        state.isOnline = false
        state.onlineListeners.forEach((listener) => listener())
      })
    },
    navigateSpy,
    queryClient,
    router,
  }
}

function expectOnlyReconnectMain() {
  expect(screen.getAllByRole('main')).toHaveLength(1)
  expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
}

describe('ReconnectRefreshBoundary', () => {
  beforeEach(() => {
    state.beginExit.mockReset()
    state.isOnline = false
    state.reconnectVersion = 0
    state.loadCurrentSession.mockReset()
    state.loadCurrentWorkspace.mockReset()
    state.loadTelegramNavigation.mockReset()
    state.loadTrackingToday.mockReset()
    state.onlineListeners.clear()
    sessionStorage.clear()
  })

  it('refreshes core reads in session, workspace and tracking order', async () => {
    const events: string[] = []
    mockSuccessfulLoaders(events)
    const harness = setup()

    harness.goOnline()

    await waitFor(() =>
      expect(events).toEqual(['session', 'workspace', 'tracking']),
    )
    expect(screen.getByText('Protected content')).toBeVisible()
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it('does not commit enabled private controls before reconnect verification starts', async () => {
    const sessionGate = createDeferred<AuthenticatedPrincipalResponseDto>()
    const onOnlineCommit = vi.fn()
    mockSuccessfulLoaders()
    state.loadCurrentSession.mockImplementation(async () => sessionGate.promise)
    const harness = setup({ onOnlineCommit })

    harness.goOnline()

    expect(
      await screen.findByText('Проверяем сессию после подключения…'),
    ).toBeVisible()
    expect(onOnlineCommit).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('button', { name: 'Protected action' }),
    ).toBeNull()

    await act(async () => sessionGate.resolve(principalA))
  })

  it('keeps a deferred session refresh alive across pathname navigation', async () => {
    const events: string[] = []
    const deferred = createDeferred<AuthenticatedPrincipalResponseDto>()
    let requestSignal: AbortSignal | undefined
    mockSuccessfulLoaders(events)
    state.loadCurrentSession.mockImplementation(
      async (_queryClient: QueryClient, signal: AbortSignal) => {
        requestSignal = signal
        return deferred.promise
      },
    )
    const harness = setup()
    screen.getByRole('link', { name: 'Protected link' }).focus()

    harness.goOnline()
    expect(
      await screen.findByText('Проверяем сессию после подключения…'),
    ).toBeVisible()
    expectOnlyReconnectMain()
    expect(screen.getByRole('main')).toHaveFocus()

    await act(async () => {
      await harness.router.navigate('/plans')
    })

    expect(requestSignal?.aborted).toBe(false)
    expect(state.loadCurrentWorkspace).not.toHaveBeenCalled()
    expect(state.loadTrackingToday).not.toHaveBeenCalled()
    expect(state.loadTelegramNavigation).not.toHaveBeenCalled()
    expectOnlyReconnectMain()

    await act(async () => {
      deferred.resolve(principalA)
      await deferred.promise
    })

    await waitFor(() => expect(events).toEqual(['workspace', 'tracking']))
    expect(requestSignal?.aborted).toBe(false)
    expect(harness.router.state.location.pathname).toBe('/plans')
    expect(screen.getByText('Protected content')).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Protected content' }),
    ).toHaveFocus()
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it('does not start downstream reads when focus fires during a deferred session refresh', async () => {
    const events: string[] = []
    const deferred = createDeferred<AuthenticatedPrincipalResponseDto>()
    mockSuccessfulLoaders(events)
    state.loadCurrentSession.mockImplementation(async () => deferred.promise)
    const harness = setup()

    harness.goOnline()
    expect(
      await screen.findByText('Проверяем сессию после подключения…'),
    ).toBeVisible()
    expectOnlyReconnectMain()

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
    })

    expect(state.loadCurrentWorkspace).not.toHaveBeenCalled()
    expect(state.loadTrackingToday).not.toHaveBeenCalled()
    expect(state.loadTelegramNavigation).not.toHaveBeenCalled()
    expectOnlyReconnectMain()

    await act(async () => {
      deferred.resolve(principalA)
      await deferred.promise
    })
    await waitFor(() => expect(events).toEqual(['workspace', 'tracking']))
  })

  it('hides the old principal and remounts private content for a replacement session', async () => {
    const events: string[] = []
    const deferred = createDeferred<AuthenticatedPrincipalResponseDto>()
    const navigation = createDeferred<void>()
    const onMount = vi.fn()
    mockSuccessfulLoaders(events)
    state.loadCurrentSession.mockImplementation(
      async (queryClient: QueryClient) => {
        const nextPrincipal = await deferred.promise
        queryClient.clear()
        queryClient.setQueryData(currentSessionQueryKey, nextPrincipal)
        return nextPrincipal
      },
    )
    const harness = setup({ onMount })
    harness.navigateSpy.mockReturnValueOnce(navigation.promise)
    expect(onMount).toHaveBeenCalledOnce()

    harness.goOnline()
    expect(
      await screen.findByText('Проверяем сессию после подключения…'),
    ).toBeVisible()
    expectOnlyReconnectMain()

    await act(async () => {
      deferred.resolve(principalB)
      await deferred.promise
    })

    await waitFor(() => expect(harness.navigateSpy).toHaveBeenCalledOnce())
    expect(state.loadCurrentWorkspace).not.toHaveBeenCalled()
    expect(state.loadTrackingToday).not.toHaveBeenCalled()
    expect(state.loadTelegramNavigation).not.toHaveBeenCalled()
    expectOnlyReconnectMain()

    await act(async () => navigation.resolve(undefined))
    await waitFor(() => expect(onMount).toHaveBeenCalledTimes(2))
    expect(events).toEqual([])
    expect(
      harness.queryClient.getQueryData(['private', 'principal-a']),
    ).toBeUndefined()
    expect(harness.queryClient.getQueryData(currentSessionQueryKey)).toEqual(
      principalB,
    )
    expect(harness.navigateSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Protected content')).toBeVisible()
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it('does not start replacement reads when root navigation removes the boundary', async () => {
    const navigation = createDeferred<void>()
    mockSuccessfulLoaders()
    state.loadCurrentSession.mockImplementation(
      async (queryClient: QueryClient) => {
        queryClient.clear()
        queryClient.setQueryData(currentSessionQueryKey, principalB)
        return principalB
      },
    )
    const harness = setup({ initialPath: '/settings?panel=session' })
    harness.navigateSpy.mockReturnValueOnce(navigation.promise)

    harness.goOnline()
    await waitFor(() => expect(harness.navigateSpy).toHaveBeenCalledOnce())
    expectOnlyReconnectMain()
    expect(state.loadCurrentWorkspace).not.toHaveBeenCalled()

    await act(async () => {
      await harness.router.navigate('/login')
    })
    await act(async () => navigation.resolve(undefined))

    expect(await screen.findByText('Login destination')).toBeVisible()
    expect(state.loadCurrentWorkspace).not.toHaveBeenCalled()
    expect(state.loadTrackingToday).not.toHaveBeenCalled()
    expect(state.loadTelegramNavigation).not.toHaveBeenCalled()
    expect(
      harness.queryClient.getQueryData(['private', 'principal-a']),
    ).toBeUndefined()
  })

  it('aborts a reconnect that goes offline and retries from session next time', async () => {
    const events: string[] = []
    let firstSignal: AbortSignal | undefined
    state.loadCurrentSession
      .mockImplementationOnce(
        (_queryClient: QueryClient, signal: AbortSignal) => {
          firstSignal = signal
          return new Promise<never>((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason), {
              once: true,
            })
          })
        },
      )
      .mockImplementationOnce(async () => {
        events.push('session')
        return principalA
      })
    state.loadCurrentWorkspace.mockImplementation(async () => {
      events.push('workspace')
      return { workspace: 'current' }
    })
    state.loadTrackingToday.mockImplementation(async () => {
      events.push('tracking')
      return { tracking: 'today' }
    })
    const harness = setup()

    harness.goOnline()
    expect(
      await screen.findByText('Проверяем сессию после подключения…'),
    ).toBeVisible()

    harness.goOffline()
    expect(await screen.findByText('Protected content')).toBeVisible()
    expect(firstSignal?.aborted).toBe(true)
    expect(state.loadCurrentWorkspace).not.toHaveBeenCalled()
    expect(state.loadTrackingToday).not.toHaveBeenCalled()

    harness.goOnline()
    await waitFor(() =>
      expect(events).toEqual(['session', 'workspace', 'tracking']),
    )
    expect(state.loadCurrentSession).toHaveBeenCalledTimes(2)
    expect(screen.getByText('Protected content')).toBeVisible()
  })

  it('does not carry a stale queued retry across a second offline edge', async () => {
    const firstSession = createDeferred<AuthenticatedPrincipalResponseDto>()
    mockSuccessfulLoaders()
    state.loadCurrentSession
      .mockImplementationOnce(async () => firstSession.promise)
      .mockResolvedValue(principalA)
    const harness = setup()

    harness.goOnline()
    expect(
      await screen.findByText('Проверяем сессию после подключения…'),
    ).toBeVisible()
    harness.goOffline()
    harness.goOnline()
    harness.goOffline()

    await act(async () => firstSession.resolve(principalA))
    harness.goOnline()

    expect(await screen.findByText('Protected content')).toBeVisible()
    await act(async () => {
      await Promise.resolve()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    expect(state.loadCurrentSession).toHaveBeenCalledTimes(2)
    expect(state.loadCurrentWorkspace).toHaveBeenCalledOnce()
    expect(state.loadTrackingToday).toHaveBeenCalledOnce()
  })

  it('keeps private cache hidden on non-auth failure and recovers only after retry', async () => {
    mockSuccessfulLoaders()
    state.loadCurrentSession
      .mockRejectedValueOnce(problem(503, 'DEPENDENCY_UNAVAILABLE'))
      .mockResolvedValueOnce(principalA)
    const harness = setup()
    harness.goOnline()

    expect(await screen.findByText('Не удалось обновить данные')).toBeVisible()
    expect(document.body).not.toHaveTextContent('Raw reconnect')
    expectOnlyReconnectMain()
    expect(
      harness.queryClient.getQueryData(['private', 'principal-a']),
    ).toEqual({ visible: true })
    expect(state.beginExit).not.toHaveBeenCalled()

    await userEvent.click(
      screen.getByRole('button', { name: 'Повторить проверку' }),
    )

    expect(await screen.findByText('Protected content')).toBeVisible()
    expect(state.loadCurrentSession).toHaveBeenCalledTimes(2)
    expect(state.loadCurrentWorkspace).toHaveBeenCalledOnce()
    expect(state.loadTrackingToday).toHaveBeenCalledOnce()
    expect(state.loadTelegramNavigation).not.toHaveBeenCalled()
    expect(
      harness.queryClient.getQueryData(['private', 'principal-a']),
    ).toEqual({ visible: true })
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it('clears private state and exits safely after authenticated session loss', async () => {
    mockSuccessfulLoaders()
    state.loadCurrentSession.mockRejectedValue(
      problem(401, 'AUTHENTICATION_REQUIRED'),
    )
    sessionStorage.setItem('planner.return-to.v1', '/plans')
    const harness = setup({
      initialPath: '/statistics/2026-08?raw=hidden#provider-token',
    })
    harness.goOnline()

    expect(await screen.findByText('Login destination')).toBeVisible()
    expect(state.beginExit).toHaveBeenCalledOnce()
    expect(harness.navigateSpy).toHaveBeenCalledTimes(1)
    expect(state.loadCurrentWorkspace).not.toHaveBeenCalled()
    expect(state.loadTrackingToday).not.toHaveBeenCalled()
    expect(state.loadTelegramNavigation).not.toHaveBeenCalled()
    expect(harness.router.state.location.pathname).toBe('/login')
    expect(harness.router.state.location.search).toBe(
      '?returnTo=%2Fstatistics%2F2026-08',
    )
    expect(sessionStorage.getItem('planner.return-to.v1')).toBeNull()
    expect(
      harness.queryClient.getQueryData(['private', 'principal-a']),
    ).toBeUndefined()
    expect(document.body).not.toHaveTextContent('Raw reconnect')
    expect(document.body).not.toHaveTextContent('provider-token')
  })

  it('invalidates optional Telegram metadata without blocking core remount', async () => {
    const events: string[] = []
    const onMount = vi.fn()
    mockSuccessfulLoaders(events)
    const harness = setup({ onMount })
    harness.queryClient.setQueryData(telegramNavigationQueryKey, {
      navigation: 'stale',
    })
    expect(onMount).toHaveBeenCalledOnce()

    harness.goOnline()
    await waitFor(() => expect(onMount).toHaveBeenCalledTimes(2))
    expect(events).toEqual(['session', 'workspace', 'tracking'])
    expect(
      harness.queryClient.getQueryData(telegramNavigationQueryKey),
    ).toBeUndefined()
    expect(state.loadTelegramNavigation).not.toHaveBeenCalled()
    expect(state.beginExit).not.toHaveBeenCalled()
    expect(screen.queryByText('Не удалось обновить данные')).toBeNull()
    expect(screen.getByText('Protected content')).toBeVisible()
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it.each(['workspace', 'tracking'] as const)(
    'exits once when the direct %s refresh returns 401',
    async (failingLoader) => {
      const events: string[] = []
      mockSuccessfulLoaders(events)

      if (failingLoader === 'workspace') {
        state.loadCurrentWorkspace.mockImplementation(async () => {
          events.push('workspace')
          throw problem(401, 'AUTHENTICATION_REQUIRED')
        })
      } else if (failingLoader === 'tracking') {
        state.loadTrackingToday.mockImplementation(async () => {
          events.push('tracking')
          throw problem(401, 'AUTHENTICATION_REQUIRED')
        })
      }

      const harness = setup({
        initialPath: '/statistics/2026-08?raw=hidden#provider-token',
      })
      harness.goOnline()

      expect(await screen.findByText('Login destination')).toBeVisible()
      expect(state.beginExit).toHaveBeenCalledOnce()
      expect(harness.navigateSpy).toHaveBeenCalledTimes(1)
      expect(harness.router.state.location.pathname).toBe('/login')
      expect(harness.router.state.location.search).toBe(
        '?returnTo=%2Fstatistics%2F2026-08',
      )
      expect(
        harness.queryClient.getQueryData(['private', 'principal-a']),
      ).toBeUndefined()
      expect(document.body).not.toHaveTextContent('Raw reconnect')
      expect(document.body).not.toHaveTextContent('provider-token')

      if (failingLoader === 'workspace') {
        expect(state.loadTrackingToday).not.toHaveBeenCalled()
        expect(state.loadTelegramNavigation).not.toHaveBeenCalled()
      } else {
        expect(state.loadTelegramNavigation).not.toHaveBeenCalled()
      }
    },
  )
})
