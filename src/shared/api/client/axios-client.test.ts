import { QueryClient } from '@tanstack/react-query'
import { delay, http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { server } from '@/shared/lib/testing'

import {
  getAuthControllerMeQueryKey,
  getAuthControllerMeQueryOptions,
} from '../generated/auth/auth'
import {
  ApiAbortError,
  ApiNetworkError,
  ApiProblemError,
  ApiProtocolError,
} from './api-errors'
import { API_AXIOS_INSTANCE } from './axios-client'
import { clearCsrfToken } from './csrf-token'
import { apiMutator } from './orval-mutator'

const apiOrigin = `${window.location.origin}/api`
const csrfToken = 'C'.repeat(43)
const principal = {
  sessionId: 'AbCdEfGhIjKlMnOpQrStUv',
  userId: '8dc70a15-d91f-4c67-b5a6-479faa42433c',
}

describe('credentialed Planner Axios transport', () => {
  beforeEach(clearCsrfToken)

  it('uses only the same-origin /api base and includes cookie credentials', async () => {
    let credentials: RequestCredentials | undefined
    let csrfRequests = 0
    server.use(
      http.get(`${apiOrigin}/auth/csrf`, () => {
        csrfRequests += 1
        return HttpResponse.json({ csrfToken })
      }),
      http.get(`${apiOrigin}/auth/me`, ({ request }) => {
        credentials = request.credentials
        return HttpResponse.json(principal)
      }),
    )

    await expect(
      apiMutator({ url: '/auth/me', method: 'GET' }),
    ).resolves.toEqual(principal)

    expect(API_AXIOS_INSTANCE.defaults.baseURL).toBe('/api')
    expect(API_AXIOS_INSTANCE.defaults.withCredentials).toBe(true)
    expect(credentials).toBe('include')
    expect(csrfRequests).toBe(0)
  })

  it('does not let request options replace the generated operation identity', async () => {
    let observedAuthorization: string | null = null
    let observedCredentials: RequestCredentials | undefined
    let observedMethod: string | undefined
    server.use(
      http.get(`${apiOrigin}/auth/me`, ({ request }) => {
        observedAuthorization = request.headers.get('authorization')
        observedCredentials = request.credentials
        observedMethod = request.method
        return HttpResponse.json(principal)
      }),
    )

    await expect(
      apiMutator({ url: '/auth/me', method: 'GET' }, {
        baseURL: 'https://attacker.invalid',
        data: { replaced: true },
        headers: { Authorization: 'Bearer must-not-leave-the-browser' },
        method: 'POST',
        url: '/unknown',
        withCredentials: false,
      } as unknown as { signal?: AbortSignal }),
    ).resolves.toEqual(principal)

    expect(observedAuthorization).toBeNull()
    expect(observedCredentials).toBe('include')
    expect(observedMethod).toBe('GET')
  })

  it.each(['https://attacker.invalid/auth/me', '//attacker.invalid/auth/me'])(
    'rejects a non-relative generated operation URL: %s',
    async (url) => {
      await expect(apiMutator({ url, method: 'GET' })).rejects.toBeInstanceOf(
        ApiProtocolError,
      )
    },
  )

  it('shares one CSRF fetch across concurrent unsafe methods and sends exact JSON', async () => {
    let csrfRequests = 0
    const observations = new Map<
      string,
      { body: string; contentType: string | null; csrf: string | null }
    >()
    const observe = async ({ request }: { request: Request }) => {
      observations.set(request.method, {
        body: await request.text(),
        contentType: request.headers.get('content-type'),
        csrf: request.headers.get('x-csrf-token'),
      })
      return new HttpResponse(null, { status: 204 })
    }

    server.use(
      http.get(`${apiOrigin}/auth/csrf`, async () => {
        csrfRequests += 1
        await delay(10)
        return HttpResponse.json({ csrfToken })
      }),
      http.post(`${apiOrigin}/transport-test`, observe),
      http.put(`${apiOrigin}/transport-test`, observe),
      http.patch(`${apiOrigin}/transport-test`, observe),
      http.delete(`${apiOrigin}/transport-test`, observe),
    )

    await Promise.all(
      ['POST', 'PUT', 'PATCH', 'DELETE'].map((method) =>
        API_AXIOS_INSTANCE.request({ method, url: '/transport-test' }),
      ),
    )

    expect(csrfRequests).toBe(1)
    expect([...observations.keys()].sort()).toEqual([
      'DELETE',
      'PATCH',
      'POST',
      'PUT',
    ])
    for (const observation of observations.values()) {
      expect(observation).toEqual({
        body: '{}',
        contentType: expect.stringContaining('application/json'),
        csrf: csrfToken,
      })
    }
  })

  it('does not exempt logout or any other public-looking unsafe path from CSRF', async () => {
    let csrfRequests = 0
    const observedHeaders: Array<string | null> = []
    server.use(
      http.get(`${apiOrigin}/auth/csrf`, () => {
        csrfRequests += 1
        return HttpResponse.json({ csrfToken })
      }),
      http.post(`${apiOrigin}/auth/logout`, ({ request }) => {
        observedHeaders.push(request.headers.get('x-csrf-token'))
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await expect(
      apiMutator({ url: '/auth/logout', method: 'POST' }),
    ).resolves.toBeUndefined()
    expect(csrfRequests).toBe(1)
    expect(observedHeaders).toEqual([csrfToken])
  })

  it('turns an invalid CSRF success body into a protocol error without sending mutation', async () => {
    let logoutRequests = 0
    server.use(
      http.get(`${apiOrigin}/auth/csrf`, () =>
        HttpResponse.json({ csrfToken: 'too-short' }),
      ),
      http.post(`${apiOrigin}/auth/logout`, () => {
        logoutRequests += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await expect(
      apiMutator({ url: '/auth/logout', method: 'POST' }),
    ).rejects.toBeInstanceOf(ApiProtocolError)
    expect(logoutRequests).toBe(0)
  })

  it.each([
    [
      'an undeclared success status',
      HttpResponse.json({ csrfToken }, { status: 201 }),
    ],
    [
      'the wrong success media type',
      new HttpResponse(JSON.stringify({ csrfToken }), {
        headers: { 'Content-Type': 'text/plain' },
      }),
    ],
  ])(
    'rejects %s from the CSRF endpoint without sending the mutation',
    async (_case, csrfResponse) => {
      let logoutRequests = 0
      server.use(
        http.get(`${apiOrigin}/auth/csrf`, () => csrfResponse.clone()),
        http.post(`${apiOrigin}/auth/logout`, () => {
          logoutRequests += 1
          return new HttpResponse(null, { status: 204 })
        }),
      )

      await expect(
        apiMutator({ url: '/auth/logout', method: 'POST' }),
      ).rejects.toBeInstanceOf(ApiProtocolError)
      expect(logoutRequests).toBe(0)
    },
  )

  it('normalizes a valid Problem response and hides raw server copy in message', async () => {
    server.use(
      http.get(`${apiOrigin}/auth/me`, () =>
        HttpResponse.json(
          {
            type: 'https://planner.invalid/problems/dependency-unavailable',
            title: 'Redis is down',
            status: 503,
            detail: 'Internal topology must not reach user copy.',
            instance: 'urn:request:request-503',
            code: 'DEPENDENCY_UNAVAILABLE',
            requestId: 'request-503',
          },
          {
            status: 503,
            headers: { 'Content-Type': 'application/problem+json' },
          },
        ),
      ),
    )

    const failure = apiMutator({ url: '/auth/me', method: 'GET' })
    await expect(failure).rejects.toBeInstanceOf(ApiProblemError)
    await expect(failure).rejects.toMatchObject({
      code: 'DEPENDENCY_UNAVAILABLE',
      message: 'The API rejected the request',
      requestId: 'request-503',
    })
  })

  it('classifies transport loss as network and cancellation as abort', async () => {
    server.use(http.get(`${apiOrigin}/auth/me`, () => HttpResponse.error()))
    await expect(
      apiMutator({ url: '/auth/me', method: 'GET' }),
    ).rejects.toBeInstanceOf(ApiNetworkError)

    server.use(
      http.get(`${apiOrigin}/auth/me`, async () => {
        await delay(250)
        return HttpResponse.json(principal)
      }),
    )
    const controller = new AbortController()
    const aborted = apiMutator({
      url: '/auth/me',
      method: 'GET',
      signal: controller.signal,
    })
    controller.abort()

    await expect(aborted).rejects.toBeInstanceOf(ApiAbortError)
  })

  it('rejects an invalid success before React Query can cache it', async () => {
    server.use(
      http.get(`${apiOrigin}/auth/me`, () =>
        HttpResponse.json({
          ...principal,
          telegramUsername: 'must-not-enter-cache',
        }),
      ),
    )
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await expect(
      queryClient.fetchQuery(getAuthControllerMeQueryOptions()),
    ).rejects.toBeInstanceOf(ApiProtocolError)
    expect(
      queryClient.getQueryData(getAuthControllerMeQueryKey()),
    ).toBeUndefined()
  })
})
