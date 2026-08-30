/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

type OnlineStatusValue = Readonly<{
  isOnline: boolean
  reconnectVersion: number
}>

const OnlineStatusContext = createContext<OnlineStatusValue | null>(null)

function readBrowserOnlineStatus() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

/** Tracks browser connectivity without owning server-state refresh policy. */
export function OnlineStatusProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState(() => ({
    isOnline: readBrowserOnlineStatus(),
    reconnectVersion: 0,
  }))

  useEffect(() => {
    const handleOffline = () =>
      setStatus((current) =>
        current.isOnline ? { ...current, isOnline: false } : current,
      )
    const handleOnline = () =>
      setStatus((current) =>
        current.isOnline
          ? current
          : {
              isOnline: true,
              reconnectVersion: current.reconnectVersion + 1,
            },
      )

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  const value = useMemo(() => status, [status])

  return (
    <OnlineStatusContext.Provider value={value}>
      {children}
    </OnlineStatusContext.Provider>
  )
}

export function useOnlineStatus() {
  const value = useContext(OnlineStatusContext)
  if (value === null) {
    throw new Error('useOnlineStatus must be used within OnlineStatusProvider')
  }
  return value
}
