import { describe, expect, it, vi } from 'vitest'

import { ApiNetworkError, ApiProblemError } from '@/shared/api'

import {
  createRedirectAuthenticatedLoader,
  createRequireSessionLoader,
} from './session-loaders'

function problem(
  status: number,
  code:
    | 'AUTHENTICATION_REQUIRED'
    | 'AUTHORIZATION_DENIED'
    | 'DEPENDENCY_UNAVAILABLE',
) {
  return new ApiProblemError(
    {
      type: 'https://planner.example.test/problems/test',
      title: 'Raw backend title',
      status,
      detail: 'Raw backend detail',
      instance: 'urn:request:loader-test',
      code,
      requestId: 'loader-test',
    },
    null,
  )
}

function run(
  loader: ReturnType<typeof createRequireSessionLoader>,
  request: Request,
) {
  return loader({ request, params: {}, context: {} as never } as never)
}

describe('protected session loader', () => {
  it('passes the navigation AbortSignal to the fresh session load', async () => {
    const request = new Request('http://planner.test/today')
    const beginExit = vi.fn()
    const clear = vi.fn()
    const confirmAccess = vi.fn()
    const load = vi.fn(async (signal: AbortSignal) => {
      expect(signal).toBe(request.signal)
    })

    await expect(
      run(
        createRequireSessionLoader({
          beginExit,
          clear,
          confirmAccess,
          load,
        }),
        request,
      ),
    ).resolves.toBeNull()
    expect(beginExit).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
    expect(confirmAccess).toHaveBeenCalledOnce()
  })

  it('does not clear a replacement session when an aborted load ends with 401', async () => {
    const controller = new AbortController()
    const request = new Request('http://planner.test/today', {
      signal: controller.signal,
    })
    let rejectLoad!: (error: unknown) => void
    const load = vi.fn(
      () =>
        new Promise<never>((_resolve, reject) => {
          rejectLoad = reject
        }),
    )
    const beginExit = vi.fn()
    const clear = vi.fn()
    const confirmAccess = vi.fn()
    const result = run(
      createRequireSessionLoader({
        beginExit,
        clear,
        confirmAccess,
        load,
      }),
      request,
    )

    controller.abort()
    const authenticationError = problem(401, 'AUTHENTICATION_REQUIRED')
    rejectLoad(authenticationError)

    await expect(result).rejects.toBe(authenticationError)
    expect(beginExit).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
    expect(confirmAccess).not.toHaveBeenCalled()
  })

  it('does not confirm access when navigation aborts after load resolution', async () => {
    const controller = new AbortController()
    const request = new Request('http://planner.test/today', {
      signal: controller.signal,
    })
    const beginExit = vi.fn()
    const clear = vi.fn()
    const confirmAccess = vi.fn()
    const load = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolve()
          controller.abort()
        }),
    )

    await expect(
      run(
        createRequireSessionLoader({
          beginExit,
          clear,
          confirmAccess,
          load,
        }),
        request,
      ),
    ).rejects.toBe(controller.signal.reason)
    expect(beginExit).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
    expect(confirmAccess).not.toHaveBeenCalled()
  })

  it('hides private UI before clearing confirmed auth loss and preserves pathname-only returnTo', async () => {
    const events: string[] = []
    const beginExit = vi.fn(() => events.push('exit'))
    const clear = vi.fn(() => events.push('clear'))
    const confirmAccess = vi.fn()
    const loader = createRequireSessionLoader({
      beginExit,
      clear,
      confirmAccess,
      load: vi.fn().mockRejectedValue(problem(401, 'AUTHENTICATION_REQUIRED')),
    })
    const request = new Request(
      'http://planner.test/statistics/2026-08?dialog=raw#token',
    )

    const response = await Promise.resolve(run(loader, request)).catch(
      (error: unknown) => error,
    )

    expect(response).toBeInstanceOf(Response)
    expect((response as Response).status).toBe(302)
    expect((response as Response).headers.get('Location')).toBe(
      '/login?returnTo=%2Fstatistics%2F2026-08',
    )
    expect(events).toEqual(['exit', 'clear'])
    expect(beginExit).toHaveBeenCalledOnce()
    expect(clear).toHaveBeenCalledOnce()
    expect(confirmAccess).not.toHaveBeenCalled()
  })

  it.each([
    new ApiNetworkError(),
    problem(403, 'AUTHORIZATION_DENIED'),
    problem(503, 'DEPENDENCY_UNAVAILABLE'),
  ])(
    'rethrows non-authentication failure without clearing state',
    async (error) => {
      const clear = vi.fn()
      const beginExit = vi.fn()
      const confirmAccess = vi.fn()
      const loader = createRequireSessionLoader({
        beginExit,
        clear,
        confirmAccess,
        load: vi.fn().mockRejectedValue(error),
      })

      await expect(
        run(loader, new Request('http://planner.test/today')),
      ).rejects.toBe(error)
      expect(beginExit).not.toHaveBeenCalled()
      expect(clear).not.toHaveBeenCalled()
      expect(confirmAccess).not.toHaveBeenCalled()
    },
  )
})

describe('public session loader', () => {
  it('redirects an authenticated browser to the root resolver', async () => {
    const beginExit = vi.fn()
    const clear = vi.fn()
    const loader = createRedirectAuthenticatedLoader({
      beginExit,
      clear,
      load: vi.fn().mockResolvedValue({}),
    })

    const response = await loader({
      request: new Request('http://planner.test/login'),
      params: {},
      context: {} as never,
    } as never)

    expect(response).toBeInstanceOf(Response)
    expect((response as Response).headers.get('Location')).toBe('/')
    expect(beginExit).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
  })

  it('shows public auth only after exact auth loss and clears stale private state', async () => {
    const events: string[] = []
    const beginExit = vi.fn(() => events.push('exit'))
    const clear = vi.fn(() => events.push('clear'))
    const loader = createRedirectAuthenticatedLoader({
      beginExit,
      clear,
      load: vi.fn().mockRejectedValue(problem(401, 'AUTHENTICATION_REQUIRED')),
    })

    await expect(
      loader({
        request: new Request('http://planner.test/login'),
        params: {},
        context: {} as never,
      } as never),
    ).resolves.toBeNull()
    expect(events).toEqual(['exit', 'clear'])
    expect(beginExit).toHaveBeenCalledOnce()
    expect(clear).toHaveBeenCalledOnce()
  })

  it('does not treat dependency failure as an anonymous session', async () => {
    const error = problem(503, 'DEPENDENCY_UNAVAILABLE')
    const beginExit = vi.fn()
    const clear = vi.fn()
    const loader = createRedirectAuthenticatedLoader({
      beginExit,
      clear,
      load: vi.fn().mockRejectedValue(error),
    })

    await expect(
      loader({
        request: new Request('http://planner.test/login'),
        params: {},
        context: {} as never,
      } as never),
    ).rejects.toBe(error)
    expect(beginExit).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
  })
})
