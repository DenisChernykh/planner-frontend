import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query'

import {
  getTrackingQueryControllerTodayQueryKey,
  trackingQueryControllerToday,
} from '@/shared/api'

import { selectTrackingNavigation } from '../model/tracking-navigation'

export const trackingTodayQueryKey = getTrackingQueryControllerTodayQueryKey()

async function fetchTrackingToday(signal: AbortSignal) {
  signal.throwIfAborted()
  const today = await trackingQueryControllerToday(undefined, signal)
  signal.throwIfAborted()
  selectTrackingNavigation(today)
  return today
}

const trackingTodayQueryOptions = queryOptions({
  queryKey: trackingTodayQueryKey,
  queryFn: ({ signal }) => fetchTrackingToday(signal),
  refetchOnMount: false,
  refetchOnReconnect: false,
  refetchOnWindowFocus: true,
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
