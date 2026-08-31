/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react'

type ProtectedSessionTransitionValue = Readonly<{
  beginExit: () => void
  isExiting: boolean
  runtimeGeneration: number
}>

type ProtectedSessionSnapshot = Readonly<{
  decisionRevision: number
  exitRevision: number
  revision: number
}>

let protectedSessionSnapshot: ProtectedSessionSnapshot = {
  decisionRevision: 0,
  exitRevision: 0,
  revision: 0,
}
const protectedSessionListeners = new Set<() => void>()

function readProtectedSessionSnapshot() {
  return protectedSessionSnapshot
}

function subscribeToProtectedSession(listener: () => void) {
  protectedSessionListeners.add(listener)
  return () => protectedSessionListeners.delete(listener)
}

function publishProtectedSessionSnapshot(snapshot: ProtectedSessionSnapshot) {
  protectedSessionSnapshot = snapshot
  protectedSessionListeners.forEach((listener) => listener())
}

/** Hides every mounted protected runtime before private cache state changes. */
export function beginProtectedSessionExit() {
  if (
    protectedSessionSnapshot.exitRevision >
    protectedSessionSnapshot.decisionRevision
  ) {
    return
  }

  const revision = protectedSessionSnapshot.revision + 1
  publishProtectedSessionSnapshot({
    ...protectedSessionSnapshot,
    exitRevision: revision,
    revision,
  })
}

/** Records a successful fresh protected-loader decision. */
export function markFreshProtectedSessionDecision() {
  const revision = protectedSessionSnapshot.revision + 1
  publishProtectedSessionSnapshot({
    ...protectedSessionSnapshot,
    decisionRevision: revision,
    revision,
  })
}

const ProtectedSessionTransitionContext =
  createContext<ProtectedSessionTransitionValue | null>(null)

/**
 * Makes an authenticated-to-public transition reactive so private observers
 * cannot keep their last successful result visible while routing settles.
 */
export function ProtectedSessionTransitionProvider({
  children,
}: PropsWithChildren) {
  const snapshot = useSyncExternalStore(
    subscribeToProtectedSession,
    readProtectedSessionSnapshot,
    readProtectedSessionSnapshot,
  )
  const isExiting = snapshot.exitRevision > snapshot.decisionRevision
  const value = useMemo(
    () => ({
      beginExit: beginProtectedSessionExit,
      isExiting,
      runtimeGeneration: snapshot.exitRevision,
    }),
    [isExiting, snapshot.exitRevision],
  )

  return (
    <ProtectedSessionTransitionContext.Provider value={value}>
      {children}
    </ProtectedSessionTransitionContext.Provider>
  )
}

export function useProtectedSessionTransition() {
  const transition = useContext(ProtectedSessionTransitionContext)
  if (transition === null) {
    throw new Error(
      'useProtectedSessionTransition must be used within ProtectedSessionTransitionProvider',
    )
  }
  return transition
}
