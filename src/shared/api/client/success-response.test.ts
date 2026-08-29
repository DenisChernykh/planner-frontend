import {
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { describe, expect, it } from 'vitest'

import { ApiProtocolError } from './api-errors'
import { parseSuccessfulApiResponse } from './success-response'

function apiResponse({
  contentType = 'application/json',
  data,
  method = 'GET',
  requestId,
  status = 200,
  url,
}: {
  contentType?: string | null
  data: unknown
  method?: string
  requestId?: string
  status?: number
  url: string
}): AxiosResponse<unknown> {
  const headers = new AxiosHeaders()
  if (contentType !== null) headers.set('content-type', contentType)
  if (requestId !== undefined) headers.set('x-request-id', requestId)
  const config = {
    headers: new AxiosHeaders(),
    method,
    url,
  } as InternalAxiosRequestConfig

  return {
    config,
    data,
    headers,
    status,
    statusText: 'OK',
  }
}

describe('parseSuccessfulApiResponse', () => {
  it('returns an operation-specific parsed auth response', async () => {
    const data = {
      sessionId: 'AbCdEfGhIjKlMnOpQrStUv',
      userId: '8dc70a15-d91f-4c67-b5a6-479faa42433c',
    }

    await expect(
      parseSuccessfulApiResponse(
        apiResponse({ data, url: '/auth/me?fresh=true' }),
      ),
    ).resolves.toEqual(data)
  })

  it('matches dynamic OpenAPI paths and parses their exact response variant', async () => {
    const data = {
      queryLocalDate: '2026-08-30',
      schemaVersion: 'tracking.month.v1',
      state: 'no_plan',
      targetMonth: '2026-08',
    }

    await expect(
      parseSuccessfulApiResponse(
        apiResponse({
          data,
          url: '/tracking/months/2026-08?viewer=current',
        }),
      ),
    ).resolves.toEqual(data)
  })

  it('accepts an exact empty-body success contract without loading a schema', async () => {
    await expect(
      parseSuccessfulApiResponse(
        apiResponse({
          contentType: null,
          data: '',
          method: 'POST',
          status: 204,
          url: '/auth/logout',
        }),
      ),
    ).resolves.toBeUndefined()
  })

  it('accepts a strict empty collection for the catalog list operation', async () => {
    await expect(
      parseSuccessfulApiResponse(
        apiResponse({
          data: [],
          url: '/planning/catalog/goal-definitions',
        }),
      ),
    ).resolves.toEqual([])
  })

  it.each([
    [
      'schema mismatch',
      apiResponse({
        data: {
          sessionId: 'too-short',
          userId: 'not-a-uuid',
        },
        url: '/auth/me',
      }),
    ],
    [
      'strict schema extra property',
      apiResponse({
        data: {
          sessionId: 'AbCdEfGhIjKlMnOpQrStUv',
          userId: '8dc70a15-d91f-4c67-b5a6-479faa42433c',
          telegramUsername: 'must-not-enter-cache',
        },
        url: '/auth/me',
      }),
    ],
    [
      'wrong success media type',
      apiResponse({
        contentType: 'text/html',
        data: '<html>proxy error</html>',
        url: '/auth/me',
      }),
    ],
    [
      'wrong operation status',
      apiResponse({ data: {}, status: 201, url: '/auth/me' }),
    ],
    [
      'wrong operation method',
      apiResponse({ data: {}, method: 'POST', url: '/auth/me' }),
    ],
    ['unregistered operation', apiResponse({ data: {}, url: '/unknown' })],
    [
      'non-empty 204 body',
      apiResponse({
        contentType: null,
        data: { unexpected: true },
        method: 'POST',
        status: 204,
        url: '/auth/logout',
      }),
    ],
    [
      'media type on empty response',
      apiResponse({
        data: '',
        method: 'POST',
        status: 204,
        url: '/auth/logout',
      }),
    ],
  ])('rejects %s before data can enter cache', async (_label, response) => {
    await expect(parseSuccessfulApiResponse(response)).rejects.toBeInstanceOf(
      ApiProtocolError,
    )
  })

  it('preserves only the diagnostic requestId on protocol failure', async () => {
    await expect(
      parseSuccessfulApiResponse(
        apiResponse({
          contentType: 'text/html',
          data: '<html>secret</html>',
          requestId: 'request-protocol-1',
          url: '/auth/me',
        }),
      ),
    ).rejects.toMatchObject({ requestId: 'request-protocol-1' })
  })
})
