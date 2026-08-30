import { describe, expect, it } from 'vitest'

import {
  ApiDocumentedResponseError,
  ApiNetworkError,
  ApiProblemError,
  ApiProtocolError,
} from '@/shared/api'

import { createQueryClient, shouldRetryQuery } from './query-client'

function problem(status: number) {
  return new ApiProblemError(
    {
      type: 'https://planner.example.test/problems/test',
      title: 'Raw title',
      status,
      detail: 'Raw detail',
      instance: 'urn:request:query-retry',
      code: status >= 500 ? 'INTERNAL_ERROR' : 'CONFLICT',
      requestId: 'query-retry',
    },
    null,
  )
}

describe('shouldRetryQuery', () => {
  it('retries network and valid 5xx failures at most twice', () => {
    expect(shouldRetryQuery(0, new ApiNetworkError())).toBe(true)
    expect(shouldRetryQuery(1, problem(503))).toBe(true)
    expect(
      shouldRetryQuery(
        1,
        new ApiDocumentedResponseError(503, { status: 'unavailable' }, null),
      ),
    ).toBe(true)
    expect(shouldRetryQuery(2, new ApiNetworkError())).toBe(false)
  })

  it('does not retry protocol, client, or aborted failures', () => {
    expect(shouldRetryQuery(0, new ApiProtocolError())).toBe(false)
    expect(shouldRetryQuery(0, problem(409))).toBe(false)
    expect(
      shouldRetryQuery(0, new DOMException('Navigation changed', 'AbortError')),
    ).toBe(false)
  })
})

describe('createQueryClient', () => {
  it('never retries or pauses mutations for a later reconnect', () => {
    const options = createQueryClient().getDefaultOptions()

    expect(options.mutations?.retry).toBe(false)
    expect(options.mutations?.networkMode).toBe('always')
  })
})
