import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getTelegramNavigation,
  type GetTelegramNavigation200,
} from '@/shared/api'

import {
  loadTelegramNavigation,
  telegramNavigationQueryKey,
} from './telegram-navigation-query'

vi.mock('@/shared/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api')>()
  return { ...actual, getTelegramNavigation: vi.fn() }
})

const navigation = {
  capability: 'open_bot',
  schemaVersion: 'telegram.navigation.v1',
  status: 'disabled',
  url: null,
} satisfies GetTelegramNavigation200

describe('Telegram navigation loader', () => {
  beforeEach(() => {
    vi.mocked(getTelegramNavigation).mockReset()
  })

  it('does not cache validated metadata after the caller aborts', async () => {
    const queryClient = new QueryClient()
    const controller = new AbortController()
    let resolveNavigation!: (value: GetTelegramNavigation200) => void
    vi.mocked(getTelegramNavigation).mockReturnValue(
      new Promise((resolve) => {
        resolveNavigation = resolve
      }),
    )

    const load = loadTelegramNavigation(queryClient, controller.signal)
    resolveNavigation(navigation)
    queueMicrotask(() => controller.abort())

    await expect(load).rejects.toMatchObject({ name: 'AbortError' })
    expect(queryClient.getQueryData(telegramNavigationQueryKey)).toBeUndefined()
  })
})
