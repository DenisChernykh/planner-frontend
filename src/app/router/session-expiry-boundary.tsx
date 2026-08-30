import { useEffect, useRef, type PropsWithChildren } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'

import { clearCurrentSession } from '@/entities/session'
import { isProblemCode } from '@/shared/api'
import { useProtectedSessionTransition } from '@/shared/lib/protected-session'
import {
  clearReturnTo,
  loginPath,
  loginPathWithReturnTo,
  sanitizeReturnTo,
} from '@/shared/routes'

/** Converts in-place authenticated query loss into one fail-closed transition. */
export function SessionExpiryBoundary({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { beginExit, isExiting } = useProtectedSessionTransition()
  const handlingAuthLoss = useRef(false)
  const pathname = useRef(location.pathname)

  useEffect(() => {
    pathname.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    if (!isExiting) handlingAuthLoss.current = false
  }, [isExiting])

  useEffect(() => {
    const handleError = (error: unknown) => {
      if (
        handlingAuthLoss.current ||
        !isProblemCode(error, 'AUTHENTICATION_REQUIRED')
      ) {
        return
      }

      handlingAuthLoss.current = true
      beginExit()
      const returnTo = sanitizeReturnTo(pathname.current)
      clearReturnTo(sessionStorage)
      clearCurrentSession(queryClient)
      void navigate(
        returnTo === null ? loginPath : loginPathWithReturnTo(returnTo),
        { replace: true },
      )
    }

    const unsubscribeQueries = queryClient
      .getQueryCache()
      .subscribe((event) => {
        if (event.type === 'updated') handleError(event.query.state.error)
      })
    const unsubscribeMutations = queryClient
      .getMutationCache()
      .subscribe((event) => {
        if (event.type !== 'updated') return
        const mutationKey = event.mutation.options.mutationKey
        const isExplicitLogout =
          mutationKey?.length === 1 && mutationKey[0] === 'authControllerLogout'
        if (!isExplicitLogout) handleError(event.mutation.state.error)
      })

    return () => {
      unsubscribeQueries()
      unsubscribeMutations()
    }
  }, [beginExit, navigate, queryClient])

  return children
}
