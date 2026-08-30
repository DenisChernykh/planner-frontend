import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ApiProtocolError,
  trackingQueryControllerToday,
  type TrackingTodayResponseV1,
} from '@/shared/api'

import {
  loadTrackingToday,
  trackingTodayQueryKey,
  useTrackingToday,
} from './tracking-today-query'

vi.mock('@/shared/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api')>()
  return { ...actual, trackingQueryControllerToday: vi.fn() }
})

const contradictoryToday = {
  lifecycleMode: 'ordinary',
  monthStatus: 'closed',
  phase: 'active',
  state: 'published',
  targetMonth: '2026-08',
} as unknown as TrackingTodayResponseV1

const validToday = {
  queryLocalDate: '2026-08-30',
  schemaVersion: 'tracking.today.v1',
  state: 'no_plan',
  targetMonth: '2026-08',
} satisfies TrackingTodayResponseV1

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

describe('tracking today query', () => {
  beforeEach(() => {
    vi.mocked(trackingQueryControllerToday).mockReset()
  })

  it('rejects contradictory lifecycle before writing it to cache', async () => {
    const { queryClient, wrapper } = setup()
    vi.mocked(trackingQueryControllerToday).mockResolvedValue(
      contradictoryToday,
    )

    const { result } = renderHook(() => useTrackingToday(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(ApiProtocolError)
    expect(queryClient.getQueryData(trackingTodayQueryKey)).toBeUndefined()
  })

  it('does not cache validated tracking after the caller aborts', async () => {
    const queryClient = new QueryClient()
    const controller = new AbortController()
    let resolveTracking!: (value: TrackingTodayResponseV1) => void
    vi.mocked(trackingQueryControllerToday).mockReturnValue(
      new Promise((resolve) => {
        resolveTracking = resolve
      }),
    )

    const load = loadTrackingToday(queryClient, controller.signal)
    resolveTracking(validToday)
    queueMicrotask(() => controller.abort())

    await expect(load).rejects.toMatchObject({ name: 'AbortError' })
    expect(queryClient.getQueryData(trackingTodayQueryKey)).toBeUndefined()
  })
})
