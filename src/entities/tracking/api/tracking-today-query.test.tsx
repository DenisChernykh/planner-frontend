import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  trackingQueryControllerToday,
  type TrackingTodayResponseV1,
} from '@/shared/api'

import {
  loadTrackingToday,
  trackingTodayQueryKey,
} from './tracking-today-query'

vi.mock('@/shared/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api')>()
  return { ...actual, trackingQueryControllerToday: vi.fn() }
})

const validToday = {
  queryLocalDate: '2026-08-30',
  schemaVersion: 'tracking.today.v1',
  state: 'no_plan',
  targetMonth: '2026-08',
} satisfies TrackingTodayResponseV1

describe('tracking today query', () => {
  beforeEach(() => {
    vi.mocked(trackingQueryControllerToday).mockReset()
  })

  it('does not cache tracking after the caller aborts', async () => {
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
