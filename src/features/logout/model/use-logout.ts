import {
  useIsMutating,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { clearCurrentSession, currentSessionQueryKey } from '@/entities/session'
import {
  authControllerLogout,
  isProblemCode,
  type AuthenticatedPrincipalResponseDto,
} from '@/shared/api'
import { useOnlineStatus } from '@/shared/lib/online-status'
import { useProtectedSessionTransition } from '@/shared/lib/protected-session'
import { clearReturnTo, loginPath } from '@/shared/routes'

const logoutMutationKey = ['authControllerLogout'] as const
const logoutInFlightClients = new WeakSet<QueryClient>()
const logoutDeniedSessions = new WeakMap<QueryClient, string>()

function getCurrentSessionId(queryClient: QueryClient) {
  return queryClient.getQueryData<AuthenticatedPrincipalResponseDto>(
    currentSessionQueryKey,
  )?.sessionId
}

function getLogoutErrorMessage(error: unknown) {
  if (isProblemCode(error, 'AUTHORIZATION_DENIED')) {
    return 'Сервер не разрешил завершить эту сессию.'
  }
  if (isProblemCode(error, 'DEPENDENCY_UNAVAILABLE')) {
    return 'Сервис временно недоступен. Сессия остаётся активной.'
  }
  return 'Не удалось выйти. Сессия остаётся активной.'
}

/** Owns the only explicit browser-session revocation flow. */
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { isOnline } = useOnlineStatus()
  const { beginExit } = useProtectedSessionTransition()
  const sharedLogoutCount = useIsMutating({
    exact: true,
    mutationKey: logoutMutationKey,
  })

  const finishLogout = () => {
    beginExit()
    clearReturnTo(sessionStorage)
    clearCurrentSession(queryClient)
    void navigate(loginPath, { replace: true })
  }

  const mutation = useMutation({
    mutationKey: logoutMutationKey,
    mutationFn: () => authControllerLogout(),
    onSuccess: finishLogout,
    onError: (error) => {
      if (isProblemCode(error, 'AUTHENTICATION_REQUIRED')) {
        finishLogout()
        return
      }
      if (isProblemCode(error, 'AUTHORIZATION_DENIED')) {
        const sessionId = getCurrentSessionId(queryClient)
        if (sessionId !== undefined) {
          logoutDeniedSessions.set(queryClient, sessionId)
        }
      }
    },
    onSettled: () => logoutInFlightClients.delete(queryClient),
  })

  const isPending = mutation.isPending || sharedLogoutCount > 0
  const currentSessionId = getCurrentSessionId(queryClient)
  const isBlocked =
    currentSessionId !== undefined &&
    logoutDeniedSessions.get(queryClient) === currentSessionId

  return {
    errorMessage:
      mutation.isError &&
      !isProblemCode(mutation.error, 'AUTHENTICATION_REQUIRED')
        ? getLogoutErrorMessage(mutation.error)
        : null,
    isOnline,
    isBlocked,
    isPending,
    logout: () => {
      if (
        !isOnline ||
        isBlocked ||
        isPending ||
        logoutInFlightClients.has(queryClient)
      ) {
        return
      }
      logoutInFlightClients.add(queryClient)
      mutation.mutate()
    },
  } as const
}
