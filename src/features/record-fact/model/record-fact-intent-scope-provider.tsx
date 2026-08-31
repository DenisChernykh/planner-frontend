import { useCallback, useMemo, useState } from 'react'

import {
  emptyScope,
  IntentScopeContext,
  type IntentEntry,
  type IntentScope,
} from './record-fact-intent-scope'

export function RecordFactIntentScopeProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [entries, setEntries] = useState<ReadonlyMap<string, IntentEntry>>(
    () => new Map(),
  )
  const register = useCallback((id: string, entry: IntentEntry) => {
    setEntries((previous) => {
      const next = new Map(previous)
      next.set(id, entry)
      return next
    })
  }, [])
  const unregister = useCallback((id: string) => {
    setEntries((previous) => {
      if (!previous.has(id)) return previous
      const next = new Map(previous)
      next.delete(id)
      return next
    })
  }, [])
  const scope = useMemo<IntentScope>(() => {
    const current = [...entries.values()]
    return {
      abandonAll: () => {
        for (const entry of current) entry.abandon()
      },
      hasBlockingIntents: current.some(
        (entry) =>
          entry.status === 'pending' ||
          entry.status === 'reconciling' ||
          entry.status === 'unknown',
      ),
      hasPendingIntents: current.some(
        (entry) => entry.status === 'pending' || entry.status === 'reconciling',
      ),
      register,
      unregister,
    }
  }, [entries, register, unregister])

  return (
    <IntentScopeContext.Provider value={scope ?? emptyScope}>
      {children}
    </IntentScopeContext.Provider>
  )
}
