import { createContext, useContext, useEffect, useId } from 'react'

import type { RecordFactIntentStatus } from './use-record-fact-intent'

export type IntentEntry = Readonly<{
  abandon: () => void
  status: RecordFactIntentStatus
}>

export type IntentScope = Readonly<{
  abandonAll: () => void
  hasBlockingIntents: boolean
  hasPendingIntents: boolean
  register: (id: string, entry: IntentEntry) => void
  unregister: (id: string) => void
}>

export const emptyScope: IntentScope = {
  abandonAll: () => undefined,
  hasBlockingIntents: false,
  hasPendingIntents: false,
  register: () => undefined,
  unregister: () => undefined,
}

export const IntentScopeContext = createContext<IntentScope>(emptyScope)

export function useRecordFactIntentScope(
  status: RecordFactIntentStatus,
  abandon: () => void,
) {
  const scope = useContext(IntentScopeContext)
  const id = useId()
  const { register, unregister } = scope

  useEffect(() => {
    register(id, { abandon, status })
    return () => unregister(id)
  }, [abandon, id, register, status, unregister])
}

export function useRecordFactIntentScopeState() {
  return useContext(IntentScopeContext)
}
