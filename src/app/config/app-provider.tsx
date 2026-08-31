import { QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'

import { OnlineStatusProvider } from '@/shared/lib/online-status'

import { queryClient } from './query-client'

/** Подключает единый server-state cache ко всему приложению. */
export function AppProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <OnlineStatusProvider>{children}</OnlineStatusProvider>
    </QueryClientProvider>
  )
}
