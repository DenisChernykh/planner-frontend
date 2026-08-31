import { describe, expect, it } from 'vitest'

import { healthLiveFixture } from './fixtures'

describe('OpenAPI-bound test fixtures', () => {
  it('records a full published revision and typed response fixture', () => {
    expect(healthLiveFixture.contract.revision).toMatch(/^[0-9a-f]{40}$/u)
    expect(healthLiveFixture.contract.sha256).toMatch(/^[0-9a-f]{64}$/u)
    expect(healthLiveFixture.response).toEqual({
      status: 'ok',
    })
  })
})
