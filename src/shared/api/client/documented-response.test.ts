import {
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { describe, expect, it } from 'vitest'

import { ApiDocumentedResponseError, ApiProtocolError } from './api-errors'
import { parseDocumentedApiErrorResponse } from './documented-response'

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

describe('parseDocumentedApiErrorResponse', () => {
  it.each([
    ['/health/ready', { status: 'unavailable' }],
    ['/health/startup', { status: 'starting' }],
  ])('validates the operation-specific JSON 503 for %s', async (url, data) => {
    await expect(
      parseDocumentedApiErrorResponse(
        apiResponse({
          data,
          requestId: 'health-request',
          status: 503,
          url,
        }),
      ),
    ).resolves.toMatchObject({
      body: data,
      requestId: 'health-request',
      status: 503,
    })
  })

  it.each([
    ['/health/ready', { status: 'starting' }],
    ['/health/startup', { status: 'starting', unexpected: true }],
  ])('rejects a malformed documented JSON 503 for %s', async (url, data) => {
    await expect(
      parseDocumentedApiErrorResponse(apiResponse({ data, status: 503, url })),
    ).rejects.toBeInstanceOf(ApiProtocolError)
  })

  it.each([
    ['/health/ready', 502, { status: 'unavailable' }],
    ['/health/live', 503, { status: 'unavailable' }],
  ])(
    'does not invent an error contract for %s at status %s',
    async (url, status, data) => {
      await expect(
        parseDocumentedApiErrorResponse(apiResponse({ data, status, url })),
      ).resolves.toBeNull()
    },
  )

  it('leaves Problem Details responses on the existing error boundary', async () => {
    await expect(
      parseDocumentedApiErrorResponse(
        apiResponse({
          contentType: 'application/problem+json',
          data: {},
          status: 503,
          url: '/health/ready',
        }),
      ),
    ).resolves.toBeNull()
  })

  it('returns the dedicated documented error type, not a success value', async () => {
    await expect(
      parseDocumentedApiErrorResponse(
        apiResponse({
          data: { status: 'unavailable' },
          status: 503,
          url: '/health/ready',
        }),
      ),
    ).resolves.toBeInstanceOf(ApiDocumentedResponseError)
  })
})
