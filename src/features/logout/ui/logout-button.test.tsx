import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createMemoryRouter,
  MemoryRouter,
  Route,
  RouterProvider,
  Routes,
} from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { currentSessionQueryKey } from '@/entities/session'
import {
  ApiProblemError,
  authControllerLogout,
  peekCsrfToken,
  setCsrfToken,
} from '@/shared/api'
import {
  markFreshProtectedSessionDecision,
  ProtectedSessionTransitionProvider,
  useProtectedSessionTransition,
} from '@/shared/lib/protected-session'

import { LogoutButton } from './logout-button'

const state = vi.hoisted(() => ({ isOnline: true }))

vi.mock('@/shared/lib/online-status', () => ({
  useOnlineStatus: () => ({ isOnline: state.isOnline }),
}))

vi.mock('@/shared/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api')>()
  return { ...actual, authControllerLogout: vi.fn() }
})

function problem(
  status: number,
  code:
    | 'AUTHENTICATION_REQUIRED'
    | 'AUTHORIZATION_DENIED'
    | 'DEPENDENCY_UNAVAILABLE',
) {
  return new ApiProblemError(
    {
      type: 'https://planner.example.test/problems/logout',
      title: 'Raw logout title',
      status,
      detail: 'Raw logout detail',
      instance: 'urn:request:logout',
      code,
      requestId: 'logout-request',
    },
    null,
  )
}

function renderLogout() {
  markFreshProtectedSessionDecision()
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  queryClient.setQueryData(currentSessionQueryKey, {
    sessionId: 'abcdefghijklmnopqrstuv',
    userId: '11111111-1111-4111-8111-111111111111',
  })
  queryClient.setQueryData(['private'], { visible: true })
  setCsrfToken('csrf-token')

  render(
    <QueryClientProvider client={queryClient}>
      <ProtectedSessionTransitionProvider>
        <MemoryRouter initialEntries={['/settings']}>
          <Routes>
            <Route path="/settings" element={<LogoutButton />} />
            <Route path="/login" element={<p>Login destination</p>} />
          </Routes>
        </MemoryRouter>
      </ProtectedSessionTransitionProvider>
    </QueryClientProvider>,
  )
  return queryClient
}

function renderSharedLogoutControls() {
  markFreshProtectedSessionDecision()
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  queryClient.setQueryData(currentSessionQueryKey, {
    sessionId: 'abcdefghijklmnopqrstuv',
    userId: '11111111-1111-4111-8111-111111111111',
  })

  render(
    <QueryClientProvider client={queryClient}>
      <ProtectedSessionTransitionProvider>
        <MemoryRouter initialEntries={['/settings']}>
          <Routes>
            <Route
              path="/settings"
              element={
                <>
                  <LogoutButton />
                  <LogoutButton />
                </>
              }
            />
            <Route path="/login" element={<p>Login destination</p>} />
          </Routes>
        </MemoryRouter>
      </ProtectedSessionTransitionProvider>
    </QueryClientProvider>,
  )
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

function ExitAwareLogout() {
  const { isExiting } = useProtectedSessionTransition()
  if (isExiting) return <p role="status">Скрываем защищённый экран</p>

  return (
    <>
      <p>Private settings marker</p>
      <LogoutButton />
    </>
  )
}

function renderProtectedLogout() {
  markFreshProtectedSessionDecision()
  const publicDestination = deferred()
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const router = createMemoryRouter(
    [
      {
        path: '/settings',
        element: (
          <ProtectedSessionTransitionProvider>
            <ExitAwareLogout />
          </ProtectedSessionTransitionProvider>
        ),
      },
      {
        path: '/login',
        loader: async () => {
          await publicDestination.promise
          return null
        },
        element: <p>Deferred login destination</p>,
      },
    ],
    { initialEntries: ['/settings'] },
  )

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { publicDestination, router }
}

describe('logout', () => {
  beforeEach(() => {
    state.isOnline = true
    vi.mocked(authControllerLogout).mockReset()
  })

  it.each([
    ['204', undefined],
    ['expired 401', problem(401, 'AUTHENTICATION_REQUIRED')],
  ])('clears private state after %s', async (_case, failure) => {
    if (failure === undefined) {
      vi.mocked(authControllerLogout).mockResolvedValue(undefined)
    } else {
      vi.mocked(authControllerLogout).mockRejectedValue(failure)
    }
    const queryClient = renderLogout()

    await userEvent.click(screen.getByRole('button', { name: 'Выйти' }))

    expect(await screen.findByText('Login destination')).toBeVisible()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(peekCsrfToken()).toBeNull()
  })

  it('keeps session state on a non-authentication failure', async () => {
    vi.mocked(authControllerLogout).mockRejectedValue(
      problem(503, 'DEPENDENCY_UNAVAILABLE'),
    )
    const queryClient = renderLogout()

    await userEvent.click(screen.getByRole('button', { name: 'Выйти' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Сервис временно недоступен. Сессия остаётся активной.',
    )
    expect(queryClient.getQueryData(['private'])).toEqual({ visible: true })
    expect(document.body).not.toHaveTextContent('Raw logout')
  })

  it('does not offer a blind retry after logout authorization denial', async () => {
    vi.mocked(authControllerLogout).mockRejectedValue(
      problem(403, 'AUTHORIZATION_DENIED'),
    )
    const user = userEvent.setup()
    renderLogout()

    await user.click(screen.getByRole('button', { name: 'Выйти' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Сервер не разрешил завершить эту сессию.',
    )
    const blocked = screen.getByRole('button', { name: 'Выход недоступен' })
    expect(blocked).toBeDisabled()
    await user.click(blocked)
    expect(authControllerLogout).toHaveBeenCalledOnce()
  })

  it('disables logout offline without queueing a request', async () => {
    state.isOnline = false
    renderLogout()

    const button = screen.getByRole('button', {
      name: 'Выход недоступен офлайн',
    })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(authControllerLogout).not.toHaveBeenCalled()
  })

  it('shares one in-flight logout across simultaneously rendered controls', async () => {
    const request = deferred()
    vi.mocked(authControllerLogout).mockReturnValue(request.promise)
    const user = userEvent.setup()
    renderSharedLogoutControls()

    const controls = screen.getAllByRole('button', { name: 'Выйти' })
    await user.click(controls[0])

    const pendingControls = await screen.findAllByRole('button', {
      name: 'Завершаем сессию',
    })
    expect(pendingControls).toHaveLength(2)
    pendingControls.forEach((control) => {
      expect(control).toBeDisabled()
      expect(control).toHaveAttribute('aria-busy', 'true')
    })

    await user.click(pendingControls[1])
    expect(authControllerLogout).toHaveBeenCalledOnce()

    await act(async () => request.resolve())
    expect(await screen.findByText('Login destination')).toBeVisible()
  })

  it('shares terminal authorization denial across logout controls', async () => {
    vi.mocked(authControllerLogout).mockRejectedValue(
      problem(403, 'AUTHORIZATION_DENIED'),
    )
    const user = userEvent.setup()
    renderSharedLogoutControls()

    await user.click(screen.getAllByRole('button', { name: 'Выйти' })[0])

    const blocked = await screen.findAllByRole('button', {
      name: 'Выход недоступен',
    })
    expect(blocked).toHaveLength(2)
    blocked.forEach((control) => expect(control).toBeDisabled())
    await user.click(blocked[1])
    expect(authControllerLogout).toHaveBeenCalledOnce()
  })

  it.each([
    ['204', undefined],
    ['expired 401', problem(401, 'AUTHENTICATION_REQUIRED')],
  ])(
    'hides protected UI immediately after explicit %s logout while public routing is pending',
    async (_case, failure) => {
      if (failure === undefined) {
        vi.mocked(authControllerLogout).mockResolvedValue(undefined)
      } else {
        vi.mocked(authControllerLogout).mockRejectedValue(failure)
      }
      const { publicDestination, router } = renderProtectedLogout()

      await userEvent.click(screen.getByRole('button', { name: 'Выйти' }))

      expect(
        screen.queryByText('Private settings marker'),
      ).not.toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent(
        'Скрываем защищённый экран',
      )
      expect(router.state.navigation.location?.pathname).toBe('/login')

      await act(async () => publicDestination.resolve())
      expect(
        await screen.findByText('Deferred login destination'),
      ).toBeVisible()
    },
  )
})
