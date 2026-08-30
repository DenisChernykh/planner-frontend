import {
  AxiosError,
  AxiosHeaders,
  CanceledError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { describe, expect, it } from 'vitest'

import {
  ApiAbortError,
  ApiDocumentedResponseError,
  ApiNetworkError,
  ApiProblemError,
  ApiProtocolError,
  isProblemCode,
  normalizeApiError,
  validateApiProblem,
} from './api-errors'
import { z } from 'zod'

const problem = {
  type: 'https://planner.invalid/problems/rate-limit-exceeded',
  title: 'Raw server title must not become the Error message',
  status: 429,
  detail: 'Raw internal detail must not become the Error message',
  instance: 'urn:request:request-1',
  code: 'RATE_LIMIT_EXCEEDED',
  requestId: 'request-1',
}

function axiosFailure({
  contentType = 'application/problem+json',
  data = problem as unknown,
  retryAfter,
  status = 429,
}: {
  contentType?: string
  data?: unknown
  retryAfter?: string
  status?: number
} = {}) {
  const headers = new AxiosHeaders({ 'content-type': contentType })
  if (retryAfter !== undefined) headers.set('retry-after', retryAfter)
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  const response: AxiosResponse = {
    config,
    data,
    headers,
    status,
    statusText: 'Request failed',
  }

  return new AxiosError(
    'Request failed',
    'ERR_BAD_RESPONSE',
    config,
    undefined,
    response,
  )
}

describe('normalizeApiError', () => {
  it('returns a safe Problem error and never uses raw title/detail as message', () => {
    const error = normalizeApiError(axiosFailure({ retryAfter: '12' }))

    expect(error).toBeInstanceOf(ApiProblemError)
    expect(error).toMatchObject({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'The API rejected the request',
      requestId: 'request-1',
      retryAfterMs: 12_000,
      status: 429,
    })
    expect(error.message).not.toContain(problem.title)
    expect(error.message).not.toContain(problem.detail)
  })

  it('strips unknown top-level extensions and retains only known extension keys', () => {
    const error = normalizeApiError(
      axiosFailure({
        data: {
          ...problem,
          blockers: [{ code: 'required' }],
          conflict: { currentRevision: '2' },
          errors: [{ pointer: '/focus', code: 'invalid', detail: 'Invalid' }],
          providerPayload: { accessToken: 'must-not-survive' },
          secret: 'must-not-survive',
        },
      }),
    )

    expect(error).toBeInstanceOf(ApiProblemError)
    if (!(error instanceof ApiProblemError)) throw new Error('unreachable')
    expect(error.problem).toMatchObject({
      blockers: [{ code: 'required' }],
      conflict: { currentRevision: '2' },
      errors: [{ pointer: '/focus', code: 'invalid', detail: 'Invalid' }],
    })
    expect(error.problem).not.toHaveProperty('providerPayload')
    expect(error.problem).not.toHaveProperty('secret')
  })

  it('accepts specialized generated Problem codes', () => {
    const error = normalizeApiError(
      axiosFailure({
        data: { ...problem, code: 'DRAFT_REVISION_CONFLICT', status: 409 },
        status: 409,
      }),
    )

    expect(isProblemCode(error, 'DRAFT_REVISION_CONFLICT')).toBe(true)
  })

  it('requires an operation schema before treating Problem extensions as typed', () => {
    const error = normalizeApiError(
      axiosFailure({
        data: {
          ...problem,
          code: 'DRAFT_REVISION_CONFLICT',
          conflict: { currentRevision: 'not-an-integer' },
          status: 409,
        },
        status: 409,
      }),
    )
    const operationProblemSchema = z.strictObject({
      code: z.literal('DRAFT_REVISION_CONFLICT'),
      conflict: z.strictObject({ currentRevision: z.number().int() }),
      detail: z.string(),
      instance: z.string(),
      requestId: z.string(),
      status: z.number().int().min(400).max(599),
      title: z.string(),
      type: z.url(),
    })

    expect(error).toBeInstanceOf(ApiProblemError)
    if (!(error instanceof ApiProblemError)) throw new Error('unreachable')
    expect(() => validateApiProblem(error, operationProblemSchema)).toThrow(
      new ApiProtocolError('request-1'),
    )
  })

  it('accepts a future HTTP-date Retry-After value', () => {
    const now = Date.UTC(2030, 0, 1, 0, 0, 0)
    const error = normalizeApiError(
      axiosFailure({
        retryAfter: 'Tue, 01 Jan 2030 00:00:05 GMT',
      }),
      now,
    )

    expect(error).toMatchObject({ retryAfterMs: 5_000 })
  })

  it.each(['-1', '0.5', 'not-a-date', 'Mon, 31 Dec 2029 23:59:59 GMT'])(
    'drops an invalid Retry-After value: %s',
    (retryAfter) => {
      const error = normalizeApiError(
        axiosFailure({ retryAfter }),
        Date.UTC(2030, 0, 1, 0, 0, 0),
      )

      expect(error).toMatchObject({ retryAfterMs: null })
    },
  )

  it.each([
    ['wrong media type', axiosFailure({ contentType: 'application/json' })],
    [
      'missing required field',
      axiosFailure({ data: { ...problem, requestId: undefined } }),
    ],
    [
      'unknown code',
      axiosFailure({ data: { ...problem, code: 'UNDECLARED_PROBLEM_CODE' } }),
    ],
  ])('maps %s to a protocol error', (_label, failure) => {
    expect(normalizeApiError(failure)).toBeInstanceOf(ApiProtocolError)
  })

  it('keeps a validated requestId when only HTTP/body status disagrees', () => {
    const error = normalizeApiError(axiosFailure({ status: 503 }))

    expect(error).toEqual(new ApiProtocolError('request-1'))
  })

  it('classifies response-less Axios failures as network errors', () => {
    expect(normalizeApiError(new AxiosError('offline'))).toBeInstanceOf(
      ApiNetworkError,
    )
  })

  it.each([
    new CanceledError('navigation changed'),
    new DOMException('navigation changed', 'AbortError'),
  ])('classifies cancellation as abort, never network', (failure) => {
    expect(normalizeApiError(failure)).toBeInstanceOf(ApiAbortError)
  })

  it('classifies an unknown thrown value as a protocol error', () => {
    expect(
      normalizeApiError(new Error('unexpected parser failure')),
    ).toBeInstanceOf(ApiProtocolError)
  })

  it.each([
    new ApiAbortError(),
    new ApiDocumentedResponseError(
      503,
      { status: 'unavailable' },
      'request-health',
    ),
    new ApiNetworkError(),
    new ApiProtocolError('request-2'),
  ])('preserves an already normalized error instance', (error) => {
    expect(normalizeApiError(error)).toBe(error)
  })
})
