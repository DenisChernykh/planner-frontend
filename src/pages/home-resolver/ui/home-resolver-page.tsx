import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'

import {
  selectRootDestination,
  useTrackingToday,
  type RootDestination,
} from '@/entities/tracking'
import {
  consumeReturnTo,
  plansPath,
  rootPath,
  statisticsPath,
  todayPath,
} from '@/shared/routes'

function getDestinationPath(destination: RootDestination) {
  if (destination.kind === 'today') return todayPath
  if (destination.kind === 'statistics') {
    return statisticsPath(destination.targetMonth)
  }
  return plansPath
}

/** Resolves `/` from one-time intent first, then authoritative server state. */
export function HomeResolverPage() {
  const navigate = useNavigate()
  const tracking = useTrackingToday()
  const resolved = useRef(false)

  useEffect(() => {
    if (resolved.current || tracking.data === undefined) return
    resolved.current = true

    const returnTo = consumeReturnTo(sessionStorage)
    if (returnTo !== null && returnTo !== rootPath) {
      void navigate(returnTo, { replace: true })
      return
    }

    const destination = selectRootDestination(tracking.data)
    void navigate(getDestinationPath(destination), { replace: true })
  }, [navigate, tracking.data])

  return (
    <div className="flex flex-1 items-center justify-center p-8" role="status">
      Выбираем актуальный экран…
    </div>
  )
}
