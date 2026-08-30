import { useEffect, useRef } from 'react'
import { useNavigation, useRevalidator } from 'react-router'

import {
  ProtectedSessionTransitionProvider,
  useProtectedSessionTransition,
} from '@/shared/lib/protected-session'
import { Spinner } from '@/shared/ui'
import { AppShell } from '@/widgets/app-shell'
import { WorkspaceGate } from '@/widgets/workspace-gate'

import { ReconnectRefreshBoundary } from './reconnect-refresh-boundary'
import { SessionExpiryBoundary } from './session-expiry-boundary'

function ProtectedRuntime() {
  const { isExiting, runtimeGeneration } = useProtectedSessionTransition()
  const navigation = useNavigation()
  const revalidator = useRevalidator()
  const recoveryRequested = useRef(false)

  useEffect(() => {
    if (!isExiting) {
      recoveryRequested.current = false
      return
    }
    if (navigation.state !== 'idle') {
      recoveryRequested.current = false
      return
    }
    if (revalidator.state !== 'idle' || recoveryRequested.current) return

    recoveryRequested.current = true
    void revalidator.revalidate()
  }, [isExiting, navigation.state, revalidator])

  if (isExiting) {
    return <ProtectedExitState />
  }

  return (
    <ReconnectRefreshBoundary key={runtimeGeneration}>
      <WorkspaceGate>
        {(workspace) => <AppShell workspace={workspace} />}
      </WorkspaceGate>
    </ReconnectRefreshBoundary>
  )
}

function ProtectedExitState() {
  const surface = useRef<HTMLElement>(null)

  useEffect(() => {
    surface.current?.focus()
  }, [])

  return (
    <main
      ref={surface}
      tabIndex={-1}
      className="flex min-h-svh items-center justify-center px-6 outline-none"
    >
      <div className="flex items-center gap-3 text-sm" role="status">
        <Spinner aria-hidden="true" />
        Обновляем доступ к Planner…
      </div>
    </main>
  )
}

/** Composes the strictly ordered authenticated runtime gates. */
export function ProtectedLayout() {
  return (
    <ProtectedSessionTransitionProvider>
      <SessionExpiryBoundary>
        <ProtectedRuntime />
      </SessionExpiryBoundary>
    </ProtectedSessionTransitionProvider>
  )
}
