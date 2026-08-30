import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearCsrfToken,
  getOrFetchCsrfTokenLease,
  peekCsrfToken,
  setCsrfToken,
} from './csrf-token'

async function readCsrfToken(fetcher: () => Promise<string>) {
  return (await getOrFetchCsrfTokenLease(fetcher)).read()
}

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
        readCsrfToken(fetcher),
        readCsrfToken(fetcher),
        readCsrfToken(fetcher),
      ]),
    ).resolves.toEqual(['token-1', 'token-1', 'token-1'])
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('does not cache a rejected fetch', async () => {
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('token-2')

    await expect(readCsrfToken(fetcher)).rejects.toThrow('offline')
    await expect(readCsrfToken(fetcher)).resolves.toBe('token-2')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('rejects every waiter when clear invalidates an in-flight fetch', async () => {
    let resolveOld!: (token: string) => void
    const oldRequest = new Promise<string>((resolve) => {
      resolveOld = resolve
    })
    const fetcher = vi.fn(() => oldRequest)

    const firstWaiter = readCsrfToken(fetcher)
    const secondWaiter = readCsrfToken(fetcher)
    clearCsrfToken()

    const results = await Promise.allSettled([firstWaiter, secondWaiter])

    expect(fetcher).toHaveBeenCalledOnce()
    expect(results).toEqual([
      expect.objectContaining({
        status: 'rejected',
        reason: expect.objectContaining({
          name: 'AbortError',
        }),
      }),
      expect.objectContaining({
        status: 'rejected',
        reason: expect.objectContaining({
          name: 'AbortError',
        }),
      }),
    ])
    expect(peekCsrfToken()).toBeNull()

    resolveOld('stale-token')
  })

  it('rejects an old waiter instead of releasing its token after set', async () => {
    let resolveOld!: (token: string) => void
    const oldRequest = new Promise<string>((resolve) => {
      resolveOld = resolve
    })
    const oldFetcher = vi.fn(() => oldRequest)
    const unusedFetcher = vi.fn(async () => 'must-not-fetch')

    const firstWaiter = readCsrfToken(oldFetcher)
    const secondWaiter = readCsrfToken(oldFetcher)
    setCsrfToken('new-session-token')

    const results = await Promise.allSettled([firstWaiter, secondWaiter])
    expect(results).toEqual([
      expect.objectContaining({
        status: 'rejected',
        reason: expect.objectContaining({ name: 'AbortError' }),
      }),
      expect.objectContaining({
        status: 'rejected',
        reason: expect.objectContaining({ name: 'AbortError' }),
      }),
    ])
    expect(oldFetcher).toHaveBeenCalledOnce()
    await expect(readCsrfToken(unusedFetcher)).resolves.toBe(
      'new-session-token',
    )
    expect(unusedFetcher).not.toHaveBeenCalled()
    expect(peekCsrfToken()).toBe('new-session-token')

    resolveOld('old-session-token')
  })

  it('rejects a fulfilled lease when clear wins before its consumer continuation', async () => {
    let resolveOld!: (token: string) => void
    const oldRequest = new Promise<string>((resolve) => {
      resolveOld = resolve
    })
    const pending = readCsrfToken(() => oldRequest)

    resolveOld('stale-token')
    queueMicrotask(clearCsrfToken)

    await expect(pending).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(peekCsrfToken()).toBeNull()
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

    const pendingOld = readCsrfToken(() => oldRequest)
    clearCsrfToken()
    const pendingNew = readCsrfToken(newFetcher)
    resolveOld('old-token')
    await expect(pendingOld).rejects.toMatchObject({
      name: 'AbortError',
    })
    const deduplicatedNew = readCsrfToken(newFetcher)
    resolveNew('new-token')

    await expect(Promise.all([pendingNew, deduplicatedNew])).resolves.toEqual([
      'new-token',
      'new-token',
    ])
    expect(newFetcher).toHaveBeenCalledOnce()
    expect(peekCsrfToken()).toBe('new-token')
  })
})
