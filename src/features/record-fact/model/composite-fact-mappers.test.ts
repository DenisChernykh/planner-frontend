import { describe, expect, it } from 'vitest'

import {
  finalizeChecklistItemFact,
  finalizeCompositeOccurrence,
  finalizeOrVariantFact,
  finalizeTextFact,
  mapChecklistItemFact,
  mapChecklistOccurrence,
  mapOrOccurrence,
  mapOrVariantFact,
  mapTextFact,
} from './composite-fact-mappers'

const target = {
  localDate: '2026-08-30',
  planGoalSnapshotId: '11111111-1111-4111-8111-111111111111',
  publicationId: '22222222-2222-4222-8222-222222222222',
} as const
const checkpointId = '33333333-3333-4333-8333-333333333333'
const itemId = '44444444-4444-4444-8444-444444444444'
const variantId = '55555555-5555-4555-8555-555555555555'
const commandId = '66666666-6666-4666-8666-666666666666'

describe('composite fact DTO mapping', () => {
  it('preserves text, date and nullable checkpoint through generated schema', () => {
    const payload = mapTextFact(
      { result: 'not_done', text: '  exact text  ' },
      target,
      null,
    )
    expect(finalizeTextFact(payload, commandId)).toEqual({
      checkpointId: null,
      commandId,
      expectationDate: target.localDate,
      planGoalSnapshotId: target.planGoalSnapshotId,
      publicationId: target.publicationId,
      result: 'not_done',
      text: '  exact text  ',
    })
    expect(() =>
      finalizeTextFact({ ...payload, irrelevant: true } as never, commandId),
    ).toThrow()
  })

  it('routes fixed checklist items with exact IDs and state', () => {
    expect(
      finalizeChecklistItemFact(
        mapChecklistItemFact({ state: 'done' }, target, itemId, checkpointId),
        commandId,
      ),
    ).toMatchObject({
      checklistItemId: itemId,
      checkpointId,
      commandId,
      expectationDate: target.localDate,
      state: 'done',
    })
  })

  it('keeps OR decimal values as strings for fixed and flexible routes', () => {
    const fixed = finalizeOrVariantFact(
      mapOrVariantFact({ value: '12.30' }, target, variantId, null, 2),
      commandId,
    )
    const flexible = finalizeCompositeOccurrence(
      mapOrOccurrence({ value: '0.25' }, target, variantId, 2),
      commandId,
    )
    expect(fixed).toMatchObject({
      value: '12.30',
      variantId,
      checkpointId: null,
    })
    expect(flexible).toMatchObject({
      component: { kind: 'or_variant', value: '0.25', variantId },
      localDate: target.localDate,
    })
    expect(typeof fixed.value).toBe('string')
    const flexibleComponent = flexible.component
    if (flexibleComponent.kind !== 'or_variant') {
      throw new Error('Expected an OR variant component')
    }
    expect(typeof flexibleComponent.value).toBe('string')
  })

  it('uses the backend component discriminant for flexible checklist occurrences', () => {
    expect(
      finalizeCompositeOccurrence(
        mapChecklistOccurrence({ state: 'not_done' }, target, itemId),
        commandId,
      ),
    ).toEqual({
      commandId,
      component: {
        checklistItemId: itemId,
        kind: 'checklist_item',
        state: 'not_done',
      },
      localDate: target.localDate,
      planGoalSnapshotId: target.planGoalSnapshotId,
      publicationId: target.publicationId,
    })
  })
})
