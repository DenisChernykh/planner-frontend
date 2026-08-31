import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query'

import {
  getGetTelegramNavigationQueryKey,
  getTelegramNavigation,
} from '@/shared/api'

export const telegramNavigationQueryKey = getGetTelegramNavigationQueryKey()

async function fetchTelegramNavigation(signal: AbortSignal) {
  signal.throwIfAborted()
  const navigation = await getTelegramNavigation(undefined, signal)
  signal.throwIfAborted()
  return navigation
}

const telegramNavigationQueryOptions = queryOptions({
  queryKey: telegramNavigationQueryKey,
  queryFn: ({ signal }) => fetchTelegramNavigation(signal),
  refetchOnMount: false,
  refetchOnReconnect: false,
  // Optional metadata is refreshed after the protected core reads complete.
  refetchOnWindowFocus: false,
})

/** Performs an authoritative optional bot-navigation refresh before remount. */
export async function loadTelegramNavigation(
  queryClient: QueryClient,
  signal: AbortSignal,
) {
  const navigation = await fetchTelegramNavigation(signal)
  signal.throwIfAborted()
  queryClient.setQueryData(telegramNavigationQueryKey, navigation)
  return navigation
}

/** Reads the authenticated server-owned Telegram bot navigation capability. */
export function useTelegramNavigation() {
  return useQuery(telegramNavigationQueryOptions)
}
