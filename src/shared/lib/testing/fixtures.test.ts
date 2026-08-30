import { describe, expect, it } from 'vitest'

import { HealthLive200Response } from '@/shared/api'

import { healthLiveFixture } from './fixtures'

describe('OpenAPI-bound test fixtures', () => {
  it('records a full published revision and passes the generated response schema', () => {
    expect(healthLiveFixture.contract.revision).toMatch(/^[0-9a-f]{40}$/u)
    expect(healthLiveFixture.contract.sha256).toMatch(/^[0-9a-f]{64}$/u)
    expect(HealthLive200Response.parse(healthLiveFixture.response)).toEqual({
      status: 'ok',
    })
  })
})
