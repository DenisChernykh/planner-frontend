import { describe, expect, it } from 'vitest'

import { server } from './server'
import {
  createM3TrackingHandlers,
  mixedTodayFixture,
  trackingFactErrorFixtures,
  trackingFactMutationFixtures,
  trackingFactRecoveryFixtures,
} from './tracking-fixtures'

describe('M3 OpenAPI-bound tracking fixtures', () => {
  it('keeps mixed Today state tied to the published contract', () => {
    expect(mixedTodayFixture.contract.revision).toBe(
      'ef76210ad66d442704417addfcf54e7f68cab65d',
    )
    expect(mixedTodayFixture.contract.sha256).toBe(
      'ed80c89d36296750da11f68f4597a732a8e4e08f82f2e81a6ba8369dd2a9a625',
    )
    expect(mixedTodayFixture.response).toMatchObject({
      day: { goals: expect.any(Array) },
      goals: expect.arrayContaining([
        expect.objectContaining({
          displayOrder: 0,
          viewerAccess: 'personal_owner',
        }),
        expect.objectContaining({ displayOrder: 1, viewerAccess: 'shared' }),
        expect.objectContaining({
          displayOrder: 2,
          viewerAccess: 'partner_read_only',
        }),
      ]),
      state: 'published',
    })
  })

  it('keeps 9 representative request cases with typed responses', () => {
    const fixtures = [
      trackingFactMutationFixtures.scalarBoolean,
      trackingFactMutationFixtures.scalarQuantity,
      trackingFactMutationFixtures.actualTime,
      trackingFactMutationFixtures.rating,
      trackingFactMutationFixtures.checkpoint,
      trackingFactMutationFixtures.text,
      trackingFactMutationFixtures.checklistItem,
      trackingFactMutationFixtures.orVariant,
      trackingFactMutationFixtures.compositeOccurrence,
    ] as const

    expect(fixtures).toHaveLength(9)
    for (const fixture of fixtures) {
      expect(fixture.response).toEqual({
        aggregateId: expect.any(String),
        aggregateRevision: expect.any(String),
        kind: 'tracking.fact-record.v1',
      })
    }
  })

  it('keeps documented validation errors and preserves retry identity', () => {
    expect(trackingFactErrorFixtures.scalarValidation.response).toMatchObject({
      code: 'VALIDATION_FAILED',
      status: 422,
    })
    expect(
      trackingFactErrorFixtures.compositeValidation.response,
    ).toMatchObject({ code: 'VALIDATION_FAILED', status: 422 })
    expect(
      trackingFactRecoveryFixtures.scalarNetworkRetry.retryRequest,
    ).toEqual(trackingFactRecoveryFixtures.scalarNetworkRetry.request)
    expect(
      trackingFactRecoveryFixtures.compositeNetworkRetry.retryRequest,
    ).toEqual(trackingFactRecoveryFixtures.compositeNetworkRetry.request)
  })

  it('serves Today, unknown/retry, and validation through MSW handlers', async () => {
    server.use(...createM3TrackingHandlers())

    const todayResponse = await fetch('http://planner.test/api/tracking/today')
    expect(todayResponse.status).toBe(200)
    expect(await todayResponse.json()).toMatchObject({ state: 'published' })

    await expect(
      fetch('http://planner.test/api/tracking/facts', { method: 'POST' }),
    ).rejects.toThrow()
    const retryResponse = await fetch(
      'http://planner.test/api/tracking/facts',
      { method: 'POST' },
    )
    expect(retryResponse.status).toBe(201)
    const retryPayload = await retryResponse.json()
    expect(retryPayload).toMatchObject({ kind: 'tracking.fact-record.v1' })

    const validationResponse = await fetch(
      'http://planner.test/api/tracking/facts/text',
      { method: 'POST' },
    )
    expect(validationResponse.status).toBe(422)
    expect(await validationResponse.json()).toMatchObject({
      code: 'VALIDATION_FAILED',
    })
  })
})
