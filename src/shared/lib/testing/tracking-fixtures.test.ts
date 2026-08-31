import { describe, expect, it } from 'vitest'

import {
  CompositeFactControllerRecordChecklistItem201Response,
  CompositeFactControllerRecordCompositeOccurrence201Response,
  CompositeFactControllerRecordOrVariant201Response,
  CompositeFactControllerRecordText201Response,
  CompositeFactControllerRecordText422Response,
  ScalarFactControllerRecordCheckpoint201Response,
  ScalarFactControllerRecordFact422Response,
  ScalarFactControllerRecordFact201Response,
  ScalarFactControllerRecordRating201Response,
  ScalarFactControllerRecordTime201Response,
  TrackingQueryControllerToday200Response,
} from '@/shared/api'

import { server } from './server'
import {
  createM3TrackingHandlers,
  mixedTodayFixture,
  trackingFactErrorFixtures,
  trackingFactMutationFixtures,
  trackingFactRecoveryFixtures,
} from './tracking-fixtures'

describe('M3 OpenAPI-bound tracking fixtures', () => {
  it('validates mixed Today state against the generated response schema', () => {
    expect(
      TrackingQueryControllerToday200Response.safeParse(
        mixedTodayFixture.response,
      ).success,
    ).toBe(true)
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

  it('validates 9 representative request cases against generated response schemas', () => {
    const fixtures = [
      {
        fixture: trackingFactMutationFixtures.scalarBoolean,
        schema: ScalarFactControllerRecordFact201Response,
      },
      {
        fixture: trackingFactMutationFixtures.scalarQuantity,
        schema: ScalarFactControllerRecordFact201Response,
      },
      {
        fixture: trackingFactMutationFixtures.actualTime,
        schema: ScalarFactControllerRecordTime201Response,
      },
      {
        fixture: trackingFactMutationFixtures.rating,
        schema: ScalarFactControllerRecordRating201Response,
      },
      {
        fixture: trackingFactMutationFixtures.checkpoint,
        schema: ScalarFactControllerRecordCheckpoint201Response,
      },
      {
        fixture: trackingFactMutationFixtures.text,
        schema: CompositeFactControllerRecordText201Response,
      },
      {
        fixture: trackingFactMutationFixtures.checklistItem,
        schema: CompositeFactControllerRecordChecklistItem201Response,
      },
      {
        fixture: trackingFactMutationFixtures.orVariant,
        schema: CompositeFactControllerRecordOrVariant201Response,
      },
      {
        fixture: trackingFactMutationFixtures.compositeOccurrence,
        schema: CompositeFactControllerRecordCompositeOccurrence201Response,
      },
    ] as const

    expect(fixtures).toHaveLength(9)
    for (const { fixture, schema } of fixtures) {
      expect(schema.safeParse(fixture.response).success).toBe(true)
    }
  })

  it('validates documented scalar/composite validation errors and preserves retry identity', () => {
    expect(
      ScalarFactControllerRecordFact422Response.safeParse(
        trackingFactErrorFixtures.scalarValidation.response,
      ).success,
    ).toBe(true)
    expect(
      CompositeFactControllerRecordText422Response.safeParse(
        trackingFactErrorFixtures.compositeValidation.response,
      ).success,
    ).toBe(true)
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
    expect(
      TrackingQueryControllerToday200Response.safeParse(
        await todayResponse.json(),
      ).success,
    ).toBe(true)

    await expect(
      fetch('http://planner.test/api/tracking/facts', { method: 'POST' }),
    ).rejects.toThrow()
    const retryResponse = await fetch(
      'http://planner.test/api/tracking/facts',
      { method: 'POST' },
    )
    expect(retryResponse.status).toBe(201)
    const retryPayload = await retryResponse.json()
    expect(
      ScalarFactControllerRecordFact201Response.safeParse(retryPayload).success,
    ).toBe(true)

    const validationResponse = await fetch(
      'http://planner.test/api/tracking/facts/text',
      { method: 'POST' },
    )
    expect(validationResponse.status).toBe(422)
    expect(
      CompositeFactControllerRecordText422Response.safeParse(
        await validationResponse.json(),
      ).success,
    ).toBe(true)
  })
})
