import { describe, expect, it } from 'vitest'

import { ScalarFactControllerRecordFactBody } from '@/shared/api'

import {
  finalizeBooleanFact,
  finalizeCheckpointFact,
  finalizeQuantityFact,
  finalizeRatingFact,
  finalizeTimeFact,
  mapBooleanFact,
  mapCheckpointFact,
  mapQuantityFact,
  mapRatingFact,
  mapTimeFact,
} from './record-fact-mappers'

const target = {
  localDate: '2026-08-30',
  planGoalSnapshotId: '11111111-1111-4111-8111-111111111111',
  publicationId: '22222222-2222-4222-8222-222222222222',
} as const
const commandId = '33333333-3333-4333-8333-333333333333'

describe('record-fact DTO mappers', () => {
  it('maps boolean and quantity values without client-only measurement fields', () => {
    expect(mapBooleanFact({ result: 'not_done' }, target)).toEqual({
      localDate: target.localDate,
      planGoalSnapshotId: target.planGoalSnapshotId,
      publicationId: target.publicationId,
      value: { kind: 'boolean', result: 'not_done' },
    })
    expect(mapQuantityFact({ value: '12.30' }, target, 2)).toEqual({
      localDate: target.localDate,
      planGoalSnapshotId: target.planGoalSnapshotId,
      publicationId: target.publicationId,
      value: { kind: 'quantity', value: '12.30' },
    })
  })

  it('keeps time, decimal, date, IDs and revision-safe values exact', () => {
    expect(mapTimeFact({ value: '08:30' }, target)).toEqual({
      expectationDate: '2026-08-30',
      planGoalSnapshotId: target.planGoalSnapshotId,
      publicationId: target.publicationId,
      value: '08:30',
    })
    expect(mapRatingFact({ value: '8' }, target, 1, 10)).toEqual({
      expectationDate: '2026-08-30',
      planGoalSnapshotId: target.planGoalSnapshotId,
      publicationId: target.publicationId,
      value: 8,
    })
  })

  it('routes scalar checkpoint discriminants to the checkpoint DTO', () => {
    expect(
      mapCheckpointFact(
        '44444444-4444-4444-8444-444444444444',
        { result: 'done' },
        target,
        'boolean',
      ),
    ).toEqual({
      checkpointId: '44444444-4444-4444-8444-444444444444',
      expectationDate: target.localDate,
      planGoalSnapshotId: target.planGoalSnapshotId,
      publicationId: target.publicationId,
      value: { kind: 'boolean', result: 'done' },
    })
    expect(
      mapCheckpointFact(
        '44444444-4444-4444-8444-444444444444',
        { value: '07:05' },
        target,
        'actual_time',
      ).value,
    ).toEqual({ kind: 'actual_time', value: '07:05' })
    expect(
      mapCheckpointFact(
        '44444444-4444-4444-8444-444444444444',
        { value: '7' },
        target,
        'rating',
        { minimum: 1, maximum: 10 },
      ).value,
    ).toEqual({ kind: 'rating', value: 7 })
  })

  it('validates the complete generated DTO only when command id exists', () => {
    expect(
      ScalarFactControllerRecordFactBody.parse(
        finalizeBooleanFact(
          mapBooleanFact({ result: 'done' }, target),
          commandId,
        ),
      ),
    ).toEqual({
      commandId,
      localDate: target.localDate,
      planGoalSnapshotId: target.planGoalSnapshotId,
      publicationId: target.publicationId,
      value: { kind: 'boolean', result: 'done' },
    })
    expect(
      finalizeQuantityFact(
        mapQuantityFact({ value: '0.25' }, target, 2),
        commandId,
      ),
    ).toMatchObject({ value: { kind: 'quantity', value: '0.25' } })
    expect(
      finalizeTimeFact(mapTimeFact({ value: '09:00' }, target), commandId),
    ).toMatchObject({ value: '09:00' })
    expect(
      finalizeRatingFact(
        mapRatingFact({ value: '9' }, target, 0, 10),
        commandId,
      ),
    ).toMatchObject({ value: 9 })
    expect(
      finalizeCheckpointFact(
        mapCheckpointFact(
          '44444444-4444-4444-8444-444444444444',
          { value: '09:00' },
          target,
          'actual_time',
        ),
        commandId,
      ),
    ).toMatchObject({ value: { kind: 'actual_time', value: '09:00' } })
  })

  it('rejects irrelevant and malformed form fields before any operation', () => {
    expect(() =>
      mapBooleanFact({ result: 'done', value: '9' } as never, target),
    ).toThrow()
    expect(() => mapQuantityFact({ value: '1.234' }, target, 2)).toThrow()
    expect(() => mapTimeFact({ value: '9:00' }, target)).toThrow()
    expect(() => mapRatingFact({ value: '2.5' }, target, 0, 10)).toThrow()
  })
})
