import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import {
  createMemoryRouter,
  RouterProvider,
  type InitialEntry,
} from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/app/config/query-client'
import { telegramNavigationQueryKey } from '@/entities/telegram-navigation'
import { trackingTodayQueryKey } from '@/entities/tracking'
import { currentWorkspaceQueryKey } from '@/entities/workspace'
import type {
  AuthenticatedPrincipalResponseDto,
  ProblemCode,
  TrackingTodayResponseV1,
  WorkspaceCurrentResponseV1,
} from '@/shared/api'
import { ApiProblemError } from '@/shared/api'
import { OnlineStatusProvider } from '@/shared/lib/online-status'
import { server } from '@/shared/lib/testing'

import { createAppRoutes } from './router'

vi.mock('@/shared/lib/hooks/use-mobile', () => ({ useIsMobile: () => false }))

const session = {
  sessionId: 'abcdefghijklmnopqrstuv',
  userId: '11111111-1111-4111-8111-111111111111',
} satisfies AuthenticatedPrincipalResponseDto

const replacementSession = {
  sessionId: 'replacement_session_01',
  userId: '55555555-5555-4555-8555-555555555555',
} satisfies AuthenticatedPrincipalResponseDto

const workspace = {
  currentMemberId: '22222222-2222-4222-8222-222222222222',
  members: [
    {
      displayName: 'Таня',
      memberId: '33333333-3333-4333-8333-333333333333',
      persona: 'tanya',
      relation: 'partner',
    },
    {
      displayName: 'Денис',
      memberId: '22222222-2222-4222-8222-222222222222',
      persona: 'denis',
      relation: 'current',
    },
  ],
  personaMappingState: 'bound',
  spaceId: '44444444-4444-4444-8444-444444444444',
  timeZone: 'Asia/Yekaterinburg',
} satisfies WorkspaceCurrentResponseV1

const replacementWorkspace = {
  ...workspace,
  currentMemberId: workspace.members[0].memberId,
  members: [
    { ...workspace.members[0], relation: 'current' as const },
    { ...workspace.members[1], relation: 'partner' as const },
  ],
} satisfies WorkspaceCurrentResponseV1

const today = {
  queryLocalDate: '2026-08-30',
  schemaVersion: 'tracking.today.v1',
  state: 'no_plan',
  targetMonth: '2026-08',
} satisfies TrackingTodayResponseV1

const activeToday = {
  activeLocalDate: '2026-08-30',
  day: {
    closure: {
      closedAt: null,
      closedCount: null,
      dayCloseId: null,
      revision: null,
      state: 'open',
    },
    coverage: { applicable: '0', filled: '0' },
    goals: [],
    localDate: '2026-08-30',
    state: 'no_data',
  },
  factsRevision: '0',
  focus: 'Сохранять ясный темп',
  goals: [],
  latePublication: false,
  lifecycleMode: 'ordinary',
  lifecycleRevision: '1',
  monthStatus: 'published',
  phase: 'active',
  planMonthId: '66666666-6666-4666-8666-666666666666',
  publicationId: '77777777-7777-4777-8777-777777777777',
  publicationRevision: '1',
  queryLocalDate: '2026-08-30',
  schemaVersion: 'tracking.today.v1',
  state: 'published',
  targetMonth: '2026-08',
} satisfies TrackingTodayResponseV1

function createDeferred() {
  let resolve!: () => void
  const promise = new Promise<void>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

function problem(status: number, code: ProblemCode) {
  return {
    code,
    detail: 'Raw backend detail must stay hidden',
    instance: 'urn:request:router-integration',
    requestId: 'router-integration',
    status,
    title: 'Raw backend title must stay hidden',
    type: 'https://planner.example.test/problems/router-integration',
  }
}

function problemResponse(status: number, code: ProblemCode) {
  return HttpResponse.json(problem(status, code), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

function installAuthenticatedHandlers(events: string[]) {
  server.use(
    http.get('*/api/auth/me', () => {
      events.push('session')
      return HttpResponse.json(session)
    }),
    http.get('*/api/workspace/current', () => {
      events.push('workspace')
      return HttpResponse.json(workspace)
    }),
    http.get('*/api/tracking/today', () => {
      events.push('tracking')
      return HttpResponse.json(today)
    }),
    http.get('*/api/telegram/navigation', () => {
      events.push('telegram-navigation')
      return HttpResponse.json({
        capability: 'open_bot',
        schemaVersion: 'telegram.navigation.v1',
        status: 'disabled',
        url: null,
      })
    }),
  )
}

function renderRouterHistory(
  initialEntries: InitialEntry[],
  initialIndex = initialEntries.length - 1,
) {
  const queryClient = createQueryClient()
  const router = createMemoryRouter(createAppRoutes(queryClient), {
    initialEntries,
    initialIndex,
  })
  render(
    <QueryClientProvider client={queryClient}>
      <OnlineStatusProvider>
        <RouterProvider router={router} />
      </OnlineStatusProvider>
    </QueryClientProvider>,
  )
  return { queryClient, router }
}

function renderRouter(initialEntry: InitialEntry) {
  return renderRouterHistory([initialEntry])
}

describe('M2 router integration', () => {
  it('shows one accessible main while the initial protected loader is pending', async () => {
    const sessionGate = createDeferred()
    const events: string[] = []
    server.use(
      http.get('*/api/auth/me', async () => {
        events.push('session')
        await sessionGate.promise
        return HttpResponse.json(session)
      }),
      http.get('*/api/workspace/current', () => {
        events.push('workspace')
        return HttpResponse.json(workspace)
      }),
      http.get('*/api/tracking/today', () => {
        events.push('tracking')
        return HttpResponse.json(today)
      }),
    )

    renderRouter('/plans')

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Открываем Planner',
    )
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(events).toEqual(['session'])
    expect(
      screen.queryByText('Месяц начинается с ясного плана.'),
    ).not.toBeInTheDocument()

    await act(async () => sessionGate.resolve())

    expect(
      await screen.findByText('Месяц начинается с ясного плана.'),
    ).toBeVisible()
  })

  it('shows the same accessible fallback while a public auth loader is pending', async () => {
    const sessionGate = createDeferred()
    server.use(
      http.get('*/api/auth/me', async () => {
        await sessionGate.promise
        return problemResponse(401, 'AUTHENTICATION_REQUIRED')
      }),
    )

    renderRouter('/login')

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Проверяем доступ к выбранному экрану.',
    )
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.queryByText('Войти в Planner')).not.toBeInTheDocument()

    await act(async () => sessionGate.resolve())

    expect(await screen.findByText('Войти в Planner')).toBeVisible()
  })

  it('serializes session, workspace and tracking before protected content', async () => {
    const events: string[] = []
    installAuthenticatedHandlers(events)

    renderRouter('/plans')

    expect(
      await screen.findByText('Месяц начинается с ясного плана.'),
    ).toBeVisible()
    expect(events.slice(0, 3)).toEqual(['session', 'workspace', 'tracking'])
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(document.body).not.toHaveTextContent(session.sessionId)
    expect(document.body).not.toHaveTextContent(session.userId)
    expect(document.body).not.toHaveTextContent(workspace.spaceId)
    expect(document.body).not.toHaveTextContent(workspace.currentMemberId)
  })

  it('redirects an anonymous deep link before any workspace or tracking read', async () => {
    const events: string[] = []
    server.use(
      http.get('*/api/auth/me', () => {
        events.push('session')
        return problemResponse(401, 'AUTHENTICATION_REQUIRED')
      }),
      http.get('*/api/workspace/current', () => {
        events.push('workspace')
        return HttpResponse.json(workspace)
      }),
      http.get('*/api/tracking/today', () => {
        events.push('tracking')
        return HttpResponse.json(today)
      }),
    )

    const { router } = renderRouter('/statistics/2026-08?raw=hidden')

    expect(await screen.findByText('Войти в Planner')).toBeVisible()
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toBe(
      '?returnTo=%2Fstatistics%2F2026-08',
    )
    expect(events).not.toContain('workspace')
    expect(events).not.toContain('tracking')
    expect(document.body).not.toHaveTextContent('hidden')
  })

  it('redirects an active public session through the root resolver', async () => {
    const events: string[] = []
    installAuthenticatedHandlers(events)

    const { router } = renderRouter('/login')

    expect(
      await screen.findByText('Месяц начинается с ясного плана.'),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe('/plans')
    expect(events.slice(0, 4)).toEqual([
      'session',
      'session',
      'workspace',
      'tracking',
    ])
  })

  it('refreshes workspace and tracking before resolving a repeated root navigation', async () => {
    const events: string[] = []
    let trackingResponse: TrackingTodayResponseV1 = today
    server.use(
      http.get('*/api/auth/me', () => {
        events.push('session')
        return HttpResponse.json(session)
      }),
      http.get('*/api/workspace/current', () => {
        events.push('workspace')
        return HttpResponse.json(workspace)
      }),
      http.get('*/api/tracking/today', () => {
        events.push('tracking')
        return HttpResponse.json(trackingResponse)
      }),
    )
    const { router } = renderRouter('/plans')

    expect(
      await screen.findByText('Месяц начинается с ясного плана.'),
    ).toBeVisible()
    trackingResponse = activeToday
    events.length = 0

    await act(async () => {
      await router.navigate('/')
    })

    expect(await screen.findByText('30 августа 2026')).toBeVisible()
    expect(router.state.location.pathname).toBe('/today')
    expect(events.slice(0, 3)).toEqual(['session', 'workspace', 'tracking'])
    expect(events.filter((event) => event === 'tracking')).toHaveLength(1)
  })

  it('refreshes Today after an authenticated navigation into the destination', async () => {
    const events: string[] = []
    let trackingResponse: TrackingTodayResponseV1 = today
    server.use(
      http.get('*/api/auth/me', () => {
        events.push('session')
        return HttpResponse.json(session)
      }),
      http.get('*/api/workspace/current', () => {
        events.push('workspace')
        return HttpResponse.json(workspace)
      }),
      http.get('*/api/tracking/today', () => {
        events.push('tracking')
        return HttpResponse.json(trackingResponse)
      }),
    )
    const { router } = renderRouter('/plans')

    expect(
      await screen.findByText('Месяц начинается с ясного плана.'),
    ).toBeVisible()
    trackingResponse = activeToday
    events.length = 0

    await act(async () => {
      await router.navigate('/today')
    })

    expect(await screen.findByText('Сохранять ясный темп')).toBeVisible()
    expect(events).toEqual(['session', 'tracking'])
  })

  it('hides and remounts mounted private observers when revalidation replaces the principal', async () => {
    const replacementWorkspaceGate = createDeferred()
    let activeSession = session
    let replacingPrincipal = false
    server.use(
      http.get('*/api/auth/me', () => HttpResponse.json(activeSession)),
      http.get('*/api/workspace/current', async () => {
        if (replacingPrincipal) await replacementWorkspaceGate.promise
        return HttpResponse.json(
          replacingPrincipal ? replacementWorkspace : workspace,
        )
      }),
      http.get('*/api/tracking/today', () => HttpResponse.json(today)),
      http.get('*/api/telegram/navigation', () =>
        HttpResponse.json({
          capability: 'open_bot',
          schemaVersion: 'telegram.navigation.v1',
          status: 'disabled',
          url: null,
        }),
      ),
    )
    const { queryClient, router } = renderRouter('/settings')

    expect(await screen.findByText('Настройки доступа')).toBeVisible()
    expect(screen.getAllByText('Денис').length).toBeGreaterThan(0)

    activeSession = replacementSession
    replacingPrincipal = true
    let navigation!: Promise<void>
    act(() => {
      navigation = router.navigate('/settings?panel=session')
    })

    expect(await screen.findByText('Открываем пространство пары')).toBeVisible()
    expect(screen.queryByText('Настройки доступа')).not.toBeInTheDocument()
    expect(screen.queryAllByText('Денис')).toHaveLength(0)
    expect(queryClient.getQueryData(currentWorkspaceQueryKey)).toBeUndefined()
    expect(screen.getAllByRole('main')).toHaveLength(1)

    await act(async () => {
      replacementWorkspaceGate.resolve()
      await navigation
    })

    expect(await screen.findByText('Настройки доступа')).toBeVisible()
    expect(screen.getAllByText('Таня').length).toBeGreaterThan(0)
    expect(queryClient.getQueryData(currentWorkspaceQueryKey)).toEqual(
      replacementWorkspace,
    )
  })

  it('hides mounted private UI before a protected-loader 401 redirect settles', async () => {
    const publicSessionGate = createDeferred()
    const events: string[] = []
    installAuthenticatedHandlers(events)
    const { queryClient, router } = renderRouter('/settings')

    expect(await screen.findByText('Настройки доступа')).toBeVisible()
    let authLossCalls = 0
    server.use(
      http.get('*/api/auth/me', async () => {
        authLossCalls += 1
        if (authLossCalls > 1) await publicSessionGate.promise
        return problemResponse(401, 'AUTHENTICATION_REQUIRED')
      }),
    )

    let navigation!: Promise<void>
    act(() => {
      navigation = router.navigate('/settings?panel=session')
    })

    expect(await screen.findByText('Обновляем доступ к Planner…')).toBeVisible()
    expect(screen.queryByText('Настройки доступа')).not.toBeInTheDocument()
    expect(screen.queryAllByText('Денис')).toHaveLength(0)
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(router.state.navigation.location?.pathname).toBe('/login')
    expect(router.state.navigation.location?.search).toBe(
      '?returnTo=%2Fsettings',
    )
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('main')).toHaveFocus()

    await act(async () => {
      publicSessionGate.resolve()
      await navigation
    })

    expect(await screen.findByText('Войти в Planner')).toBeVisible()
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Сначала — подтвердите себя в Telegram.',
      }),
    ).toHaveFocus()
  })

  it('revalidates a protected sibling after Back interrupts a pending login', async () => {
    const publicSessionGate = createDeferred()
    const events: string[] = []
    installAuthenticatedHandlers(events)
    const { queryClient, router } = renderRouterHistory(['/plans', '/settings'])

    expect(await screen.findByText('Настройки доступа')).toBeVisible()
    let authCalls = 0
    server.use(
      http.get('*/api/auth/me', async () => {
        authCalls += 1
        if (authCalls === 1) await publicSessionGate.promise
        return HttpResponse.json(session)
      }),
    )
    const authenticationError = new ApiProblemError(
      problem(401, 'AUTHENTICATION_REQUIRED'),
      null,
    )

    await act(async () => {
      await queryClient
        .fetchQuery({
          queryKey: ['private', 'back-recovery'],
          queryFn: async () => {
            throw authenticationError
          },
        })
        .catch(() => undefined)
    })

    expect(await screen.findByText('Обновляем доступ к Planner…')).toBeVisible()
    expect(router.state.navigation.location?.pathname).toBe('/login')

    await act(async () => {
      await router.navigate(-1)
    })

    expect(
      await screen.findByText('Месяц начинается с ясного плана.'),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe('/plans')
    expect(authCalls).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('Обновляем доступ к Planner…')).toBeNull()

    await act(async () => publicSessionGate.resolve())
  })

  it('keeps a public dependency failure distinct from anonymous login', async () => {
    server.use(
      http.get('*/api/auth/me', () =>
        problemResponse(503, 'DEPENDENCY_UNAVAILABLE'),
      ),
    )

    const { router } = renderRouter('/login')

    expect(await screen.findByText('Сервис временно недоступен.')).toBeVisible()
    expect(router.state.location.pathname).toBe('/login')
    expect(screen.queryByText('Войти в Planner')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('Raw backend')
  })

  it('does not offer blind retry for workspace authorization denial', async () => {
    server.use(
      http.get('*/api/auth/me', () => HttpResponse.json(session)),
      http.get('*/api/workspace/current', () =>
        problemResponse(403, 'WORKSPACE_AUTHORIZATION_DENIED'),
      ),
    )

    renderRouter('/today')

    expect(
      await screen.findByText(
        'Для этого аккаунта пространство пары недоступно.',
      ),
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Повторить' })).toBeNull()
  })

  it('does not offer blind retry for tracking authorization denial', async () => {
    server.use(
      http.get('*/api/auth/me', () => HttpResponse.json(session)),
      http.get('*/api/workspace/current', () => HttpResponse.json(workspace)),
      http.get('*/api/tracking/today', () =>
        problemResponse(403, 'TRACKING_AUTHORIZATION_DENIED'),
      ),
    )

    renderRouter('/today')

    expect(await screen.findByText('Контекст месяца недоступен')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Повторить' })).toBeNull()
  })

  it('keeps Telegram authorization denial local without blind retry', async () => {
    const events: string[] = []
    installAuthenticatedHandlers(events)
    server.use(
      http.get('*/api/telegram/navigation', () =>
        problemResponse(403, 'AUTHORIZATION_DENIED'),
      ),
    )

    renderRouter('/settings')

    expect(
      await screen.findByText('Не удалось проверить доступность бота.'),
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Повторить' })).toBeNull()
    expect(screen.getByText('Настройки доступа')).toBeVisible()
  })

  it('hides stale Telegram navigation metadata when its refetch fails', async () => {
    let failTelegramRefetch = false
    installAuthenticatedHandlers([])
    server.use(
      http.get('*/api/telegram/navigation', () => {
        if (failTelegramRefetch) {
          return problemResponse(403, 'AUTHORIZATION_DENIED')
        }
        return HttpResponse.json({
          capability: 'open_bot',
          schemaVersion: 'telegram.navigation.v1',
          status: 'available',
          url: 'https://t.me/planner_test_bot',
        })
      }),
    )

    const { queryClient } = renderRouter('/settings')

    expect(
      await screen.findByRole('link', { name: 'Открыть Planner-бота' }),
    ).toHaveAttribute('href', 'https://t.me/planner_test_bot')

    failTelegramRefetch = true
    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: telegramNavigationQueryKey,
      })
    })

    expect(
      await screen.findByText('Не удалось проверить доступность бота.'),
    ).toBeVisible()
    expect(
      screen.queryByRole('link', { name: 'Открыть Planner-бота' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'Переход в бота сейчас отключён администратором пространства.',
      ),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Повторить' })).toBeNull()
  })

  it('keeps exact settings reachable when tracking is unavailable', async () => {
    let trackingCalls = 0
    server.use(
      http.get('*/api/auth/me', () => HttpResponse.json(session)),
      http.get('*/api/workspace/current', () => HttpResponse.json(workspace)),
      http.get('*/api/tracking/today', () => {
        trackingCalls += 1
        return problemResponse(403, 'TRACKING_AUTHORIZATION_DENIED')
      }),
      http.get('*/api/telegram/navigation', () =>
        HttpResponse.json({
          capability: 'open_bot',
          schemaVersion: 'telegram.navigation.v1',
          status: 'disabled',
          url: null,
        }),
      ),
    )

    const { queryClient } = renderRouter('/settings')

    expect(await screen.findByText('Настройки доступа')).toBeVisible()
    await waitFor(() => {
      expect(trackingCalls).toBe(1)
      expect(queryClient.getQueryState(trackingTodayQueryKey)?.status).toBe(
        'error',
      )
    })
    expect(screen.queryByText('Контекст месяца недоступен')).toBeNull()
  })

  it('does not let private observers bypass the focus refresh order', async () => {
    const sessionGate = createDeferred()
    const events: string[] = []
    installAuthenticatedHandlers(events)
    const { router } = renderRouter('/settings')

    expect(await screen.findByText('Настройки доступа')).toBeVisible()
    events.length = 0
    let sessionCalls = 0
    server.use(
      http.get('*/api/auth/me', async () => {
        sessionCalls += 1
        events.push('session')
        if (sessionCalls === 1) await sessionGate.promise
        return HttpResponse.json(session)
      }),
      http.get('*/api/workspace/current', () => {
        events.push('workspace')
        return HttpResponse.json(workspace)
      }),
      http.get('*/api/tracking/today', () => {
        events.push('tracking')
        return HttpResponse.json(today)
      }),
    )

    await act(async () => {
      window.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
    })

    expect(
      await screen.findByText('Проверяем сессию после подключения…'),
    ).toBeVisible()
    expect(events).toEqual(['session'])
    expect(router.state.location.pathname).toBe('/settings')

    await act(async () => sessionGate.resolve())

    expect(await screen.findByText('Настройки доступа')).toBeVisible()
    expect(events.slice(0, 3)).toEqual(['session', 'workspace', 'tracking'])
  })

  it.each([
    ['/today', '30 августа 2026'],
    ['/months/2026-08', 'Контекст 2026-08'],
    ['/plans', 'Месяц начинается с ясного плана.'],
    ['/statistics/2026-08', 'Итоги 2026-08'],
    ['/settings', 'Настройки доступа'],
  ])('restores protected destination %s after reload', async (path, copy) => {
    const events: string[] = []
    installAuthenticatedHandlers(events)

    renderRouter(path)

    expect(await screen.findByText(copy)).toBeVisible()
    expect(events.slice(0, 3)).toEqual(['session', 'workspace', 'tracking'])
  })

  it.each(['/months/0000-01', '/months/2026-13', '/statistics/not-a-month'])(
    'renders a local safe not-found for invalid month route %s',
    async (path) => {
      const events: string[] = []
      installAuthenticatedHandlers(events)

      const { router } = renderRouter(path)

      expect(
        await screen.findByRole('heading', { name: 'Такой страницы пока нет' }),
      ).toBeVisible()
      expect(router.state.location.pathname).toBe(path)
      expect(document.body).not.toHaveTextContent('Контекст 2026-13')
      expect(document.body).not.toHaveTextContent('Итоги not-a-month')
    },
  )

  it('renders a local safe not-found for an unsupported nested plans route', async () => {
    const events: string[] = []
    installAuthenticatedHandlers(events)

    const { router } = renderRouter('/plans/not-a-real-route')

    expect(
      await screen.findByRole('heading', { name: 'Такой страницы пока нет' }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe('/plans/not-a-real-route')
    expect(
      screen.queryByText('Месяц начинается с ясного плана.'),
    ).not.toBeInTheDocument()
  })
})
