import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearCsrfToken,
  getOrFetchCsrfToken,
  peekCsrfToken,
  setCsrfToken,
} from './csrf-token'

describe('CSRF token memory', () => {
  beforeEach(clearCsrfToken)

  it('keeps the token only in module memory and clears it explicitly', () => {
    setCsrfToken('token-1')
    expect(peekCsrfToken()).toBe('token-1')

    clearCsrfToken()
    expect(peekCsrfToken()).toBeNull()
  })

  it('deduplicates concurrent fetches', async () => {
    const fetcher = vi.fn(async () => 'token-1')

    await expect(
      Promise.all([
        getOrFetchCsrfToken(fetcher),
        getOrFetchCsrfToken(fetcher),
        getOrFetchCsrfToken(fetcher),
      ]),
    ).resolves.toEqual(['token-1', 'token-1', 'token-1'])
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('does not cache a rejected fetch', async () => {
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('token-2')

    await expect(getOrFetchCsrfToken(fetcher)).rejects.toThrow('offline')
    await expect(getOrFetchCsrfToken(fetcher)).resolves.toBe('token-2')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('does not let a late response restore a token after clear', async () => {
    let resolveOld!: (token: string) => void
    const oldRequest = new Promise<string>((resolve) => {
      resolveOld = resolve
    })

    const pending = getOrFetchCsrfToken(() => oldRequest)
    clearCsrfToken()
    resolveOld('stale-token')
    await pending

    expect(peekCsrfToken()).toBeNull()
  })

  it('does not let a stale response overwrite a newer session token', async () => {
    let resolveOld!: (token: string) => void
    const oldRequest = new Promise<string>((resolve) => {
      resolveOld = resolve
    })

    const pending = getOrFetchCsrfToken(() => oldRequest)
    clearCsrfToken()
    setCsrfToken('new-session-token')
    resolveOld('old-session-token')
    await pending

    expect(peekCsrfToken()).toBe('new-session-token')
  })

  it('keeps deduplicating a newer generation while the old one settles', async () => {
    let resolveOld!: (token: string) => void
    let resolveNew!: (token: string) => void
    const oldRequest = new Promise<string>((resolve) => {
      resolveOld = resolve
    })
    const newRequest = new Promise<string>((resolve) => {
      resolveNew = resolve
    })
    const newFetcher = vi.fn(() => newRequest)

    const pendingOld = getOrFetchCsrfToken(() => oldRequest)
    clearCsrfToken()
    const pendingNew = getOrFetchCsrfToken(newFetcher)
    resolveOld('old-token')
    await pendingOld
    const deduplicatedNew = getOrFetchCsrfToken(newFetcher)
    resolveNew('new-token')

    await expect(Promise.all([pendingNew, deduplicatedNew])).resolves.toEqual([
      'new-token',
      'new-token',
    ])
    expect(newFetcher).toHaveBeenCalledOnce()
    expect(peekCsrfToken()).toBe('new-token')
  })
})
