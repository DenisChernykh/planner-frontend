import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query'

import {
  getTrackingQueryControllerTodayQueryKey,
  trackingQueryControllerToday,
} from '@/shared/api'

import { selectTrackingNavigation } from '../model/tracking-navigation'
import { selectTrackingTodayPresentation } from '../model/tracking-today-presentation'

export const trackingTodayQueryKey = getTrackingQueryControllerTodayQueryKey()

async function fetchTrackingToday(signal: AbortSignal) {
  signal.throwIfAborted()
  const today = await trackingQueryControllerToday(undefined, signal)
  signal.throwIfAborted()
  selectTrackingNavigation(today)
  return selectTrackingTodayPresentation(today)
}

const trackingTodayQueryOptions = queryOptions({
  queryKey: trackingTodayQueryKey,
  queryFn: ({ signal }) => fetchTrackingToday(signal),
  refetchOnMount: false,
  refetchOnReconnect: false,
  // Browser focus is refreshed through the protected session boundary so
  // session, workspace and tracking reads cannot race each other.
  refetchOnWindowFocus: false,
})

/** Performs a validated authoritative tracking refresh before remount. */
export async function loadTrackingToday(
  queryClient: QueryClient,
  signal: AbortSignal,
) {
  const today = await fetchTrackingToday(signal)
  signal.throwIfAborted()
  queryClient.setQueryData(trackingTodayQueryKey, today)
  return today
}

/** Reads the authoritative current tracking/lifecycle context. */
export function useTrackingToday() {
  return useQuery(trackingTodayQueryOptions)
}
