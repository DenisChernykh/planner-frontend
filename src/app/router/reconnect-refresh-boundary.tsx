import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { focusManager, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'

import {
  clearCurrentSession,
  currentSessionQueryKey,
  loadCurrentSession,
} from '@/entities/session'
import { telegramNavigationQueryKey } from '@/entities/telegram-navigation'
import { loadTrackingToday } from '@/entities/tracking'
import { loadCurrentWorkspace } from '@/entities/workspace'
import {
  isProblemCode,
  type AuthenticatedPrincipalResponseDto,
} from '@/shared/api'
import { useOnlineStatus } from '@/shared/lib/online-status'
import { useProtectedSessionTransition } from '@/shared/lib/protected-session'
import { ProtectedRefreshProvider } from '@/shared/lib/protected-refresh'
import {
  clearReturnTo,
  loginPath,
  loginPathWithReturnTo,
  rootPath,
  sanitizeReturnTo,
} from '@/shared/routes'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Spinner,
} from '@/shared/ui'

type RefreshState = 'idle' | 'refreshing' | 'error'

function isDifferentPrincipal(
  previous: AuthenticatedPrincipalResponseDto | undefined,
  current: AuthenticatedPrincipalResponseDto,
) {
  return (
    previous !== undefined &&
    (previous.sessionId !== current.sessionId ||
      previous.userId !== current.userId)
  )
}

function ReconnectState({
  isOnline,
  onRetry,
  state,
}: Readonly<{
  isOnline: boolean
  onRetry: () => void
  state: Exclude<RefreshState, 'idle'>
}>) {
  const surface = useRef<HTMLElement>(null)

  useEffect(() => {
    surface.current?.focus()
  }, [state])

  const content =
    state === 'refreshing' ? (
      <div className="flex items-center gap-3 text-sm" role="status">
        <Spinner aria-hidden="true" />
        Проверяем сессию после подключения…
      </div>
    ) : (
      <div className="w-full max-w-lg">
        <Alert variant="destructive">
          <AlertTitle>Не удалось обновить данные</AlertTitle>
          <AlertDescription>
            Planner скрыл защищённые экраны, пока не подтвердит текущую сессию и
            контекст пары.
          </AlertDescription>
        </Alert>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          disabled={!isOnline}
          onClick={onRetry}
        >
          Повторить проверку
        </Button>
      </div>
    )

  return (
    <main
      ref={surface}
      tabIndex={-1}
      className="flex min-h-svh items-center justify-center px-6 outline-none"
    >
      {content}
    </main>
  )
}

/** Refreshes M2 live reads in auth order after reconnect or browser focus. */
export function ReconnectRefreshBoundary({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const { isOnline, reconnectVersion } = useOnlineStatus()
  const { beginExit } = useProtectedSessionTransition()
  const [refreshState, setRefreshState] = useState<RefreshState>('idle')
  const [completedReconnectVersion, setCompletedReconnectVersion] =
    useState(reconnectVersion)
  const [retryVersion, setRetryVersion] = useState(0)
  const [focusVersion, setFocusVersion] = useState(0)
  const [protectedSurfaceVersion, setProtectedSurfaceVersion] = useState(0)
  const [focusRequestPending, setFocusRequestPending] = useState(false)
  const [retryRequestPending, setRetryRequestPending] = useState(false)
  const [queuedRefreshPending, setQueuedRefreshPending] = useState(false)
  const handledRetryVersion = useRef(0)
  const handledFocusVersion = useRef(0)
  const refreshRunning = useRef(false)
  const abortController = useRef<AbortController | null>(null)
  const protectedSurface = useRef<HTMLDivElement>(null)
  const restoreFocusAfterRefresh = useRef(false)
  const pathname = useRef(location.pathname)
  const online = useRef(isOnline)
  const runAgainAfterCurrent = useRef(false)

  useEffect(() => {
    pathname.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    online.current = isOnline
  }, [isOnline])

  const runRefresh = useEffectEvent(
    async (requestedReconnectVersion: number) => {
      if (refreshRunning.current || !online.current) return

      refreshRunning.current = true
      setRefreshState('refreshing')
      setFocusRequestPending(false)
      setRetryRequestPending(false)
      // This pass is the queued pass, if any. Clear the render marker as soon
      // as it starts; a new focus event can set it again while this pass runs.
      runAgainAfterCurrent.current = false
      setQueuedRefreshPending(false)
      const controller = new AbortController()
      abortController.current = controller

      try {
        const previousSession =
          queryClient.getQueryData<AuthenticatedPrincipalResponseDto>(
            currentSessionQueryKey,
          )
        const currentSession = await loadCurrentSession(
          queryClient,
          controller.signal,
        )
        controller.signal.throwIfAborted()

        if (isDifferentPrincipal(previousSession, currentSession)) {
          runAgainAfterCurrent.current = false
          setQueuedRefreshPending(false)
          beginExit()
          setProtectedSurfaceVersion((version) => version + 1)
          await navigate(rootPath, { replace: true })
          controller.signal.throwIfAborted()
          queryClient.removeQueries({
            exact: true,
            queryKey: telegramNavigationQueryKey,
          })
          setCompletedReconnectVersion((completed) =>
            Math.max(completed, requestedReconnectVersion),
          )
          setRefreshState('idle')
          return
        }

        await loadCurrentWorkspace(queryClient, controller.signal)
        controller.signal.throwIfAborted()
        await loadTrackingToday(queryClient, controller.signal)
        controller.signal.throwIfAborted()
        queryClient.removeQueries({
          exact: true,
          queryKey: telegramNavigationQueryKey,
        })
        setCompletedReconnectVersion((completed) =>
          Math.max(completed, requestedReconnectVersion),
        )
        setRefreshState('idle')
      } catch (error) {
        if (controller.signal.aborted) return
        if (!isProblemCode(error, 'AUTHENTICATION_REQUIRED')) {
          setCompletedReconnectVersion((completed) =>
            Math.max(completed, requestedReconnectVersion),
          )
          setRefreshState(online.current ? 'error' : 'idle')
          return
        }

        runAgainAfterCurrent.current = false
        setQueuedRefreshPending(false)
        beginExit()
        const returnTo = sanitizeReturnTo(pathname.current)
        clearReturnTo(sessionStorage)
        clearCurrentSession(queryClient)
        void navigate(
          returnTo === null ? loginPath : loginPathWithReturnTo(returnTo),
          { replace: true },
        )
      } finally {
        if (abortController.current === controller) {
          abortController.current = null
        }
        refreshRunning.current = false
        if (runAgainAfterCurrent.current && online.current) {
          setRetryVersion((version) => version + 1)
        }
      }
    },
  )

  const requestFocusRefresh = useEffectEvent(() => {
    if (!isOnline) return
    if (refreshRunning.current) {
      // The current pass may have checked the session before the browser focus
      // event arrived. Queue one additional session-first pass, but never
      // start parallel workspace or tracking reads.
      runAgainAfterCurrent.current = true
      setQueuedRefreshPending(true)
      return
    }
    setFocusRequestPending(true)
    setFocusVersion((version) => version + 1)
  })

  useEffect(() => {
    const unsubscribe = focusManager.subscribe((focused) => {
      if (focused) requestFocusRefresh()
    })
    const handleWindowFocus = () => requestFocusRefresh()
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      unsubscribe()
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [])

  useEffect(() => {
    const retryRequested = retryVersion !== handledRetryVersion.current
    const focusRequested = focusVersion !== handledFocusVersion.current
    if (retryRequested) handledRetryVersion.current = retryVersion
    if (focusRequested) handledFocusVersion.current = focusVersion

    if (!isOnline) {
      abortController.current?.abort()
      runAgainAfterCurrent.current = false
      // These flags mirror requests which are only meaningful while the
      // browser is online. Clear them together with the aborted external
      // refresh so a later reconnect cannot inherit an old queued request.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFocusRequestPending(false)
      setRetryRequestPending(false)
      setQueuedRefreshPending(false)
      return
    }
    const reconnectRequested = reconnectVersion > completedReconnectVersion
    if (!reconnectRequested && !retryRequested && !focusRequested) return

    if (refreshRunning.current) {
      runAgainAfterCurrent.current = true
      setQueuedRefreshPending(true)
      return
    }
    void runRefresh(reconnectVersion)
  }, [
    completedReconnectVersion,
    focusVersion,
    isOnline,
    reconnectVersion,
    retryVersion,
  ])

  useEffect(
    () => () => {
      abortController.current?.abort()
    },
    [],
  )

  const reconnectEdgePending =
    isOnline && reconnectVersion > completedReconnectVersion
  const refreshRequestPending =
    reconnectEdgePending ||
    focusRequestPending ||
    retryRequestPending ||
    queuedRefreshPending
  const protectedRefreshState =
    refreshRequestPending || refreshState === 'refreshing'
      ? 'refreshing'
      : refreshState
  const refreshPending =
    isOnline && (refreshState !== 'idle' || refreshRequestPending)

  useEffect(() => {
    if (refreshPending) {
      restoreFocusAfterRefresh.current = true
      return
    }
    if (!restoreFocusAfterRefresh.current) return

    restoreFocusAfterRefresh.current = false
    protectedSurface.current
      ?.querySelector<HTMLElement>('[data-protected-page-heading="true"]')
      ?.focus()
  }, [refreshPending])

  return (
    <ProtectedRefreshProvider
      state={refreshPending ? protectedRefreshState : 'idle'}
    >
      <div
        ref={protectedSurface}
        key={protectedSurfaceVersion}
        hidden={refreshPending}
        inert={refreshPending}
      >
        {children}
      </div>
      {refreshPending && (
        <ReconnectState
          isOnline={isOnline}
          onRetry={() => {
            setRetryRequestPending(true)
            setRetryVersion((version) => version + 1)
          }}
          state={
            !refreshRequestPending && refreshState === 'error'
              ? 'error'
              : 'refreshing'
          }
        />
      )}
    </ProtectedRefreshProvider>
  )
}
