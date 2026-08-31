/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type PropsWithChildren } from 'react'

export type ProtectedRefreshState = 'idle' | 'refreshing' | 'error'

const ProtectedRefreshContext = createContext<ProtectedRefreshState>('idle')

export function ProtectedRefreshProvider({
  children,
  state,
}: PropsWithChildren<{ state: ProtectedRefreshState }>) {
  return (
    <ProtectedRefreshContext.Provider value={state}>
      {children}
    </ProtectedRefreshContext.Provider>
  )
}

/** Reads the protected auth-ordered refresh state for a mounted private surface. */
export function useProtectedRefreshState() {
  return useContext(ProtectedRefreshContext)
}
