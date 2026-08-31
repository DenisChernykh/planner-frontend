import { z } from 'zod'

import {
  ScalarFactControllerRecordCheckpointBody,
  ScalarFactControllerRecordFactBody,
  ScalarFactControllerRecordRatingBody,
  ScalarFactControllerRecordTimeBody,
} from '@/shared/api'

import {
  actualTimeFactFormSchema,
  booleanFactFormSchema,
  createQuantityFactFormSchema,
  createRatingFactFormSchema,
  type ActualTimeFactFormValues,
  type BooleanFactFormValues,
  type QuantityFactFormValues,
  type RatingFactFormValues,
} from './record-fact-schemas'

export type FactTarget = Readonly<{
  localDate: string
  planGoalSnapshotId: string
  publicationId: string
}>

type BooleanFactBody = z.infer<typeof ScalarFactControllerRecordFactBody>
type QuantityFactBody = BooleanFactBody & {
  value: { kind: 'quantity'; value: string }
}
type TimeFactBody = z.infer<typeof ScalarFactControllerRecordTimeBody>
type RatingFactBody = z.infer<typeof ScalarFactControllerRecordRatingBody>
type CheckpointFactBody = z.infer<
  typeof ScalarFactControllerRecordCheckpointBody
>

export type BooleanFactPayload = Omit<BooleanFactBody, 'commandId'>
export type QuantityFactPayload = Omit<QuantityFactBody, 'commandId'>
export type TimeFactPayload = Omit<TimeFactBody, 'commandId'>
export type RatingFactPayload = Omit<RatingFactBody, 'commandId'>
export type CheckpointFactPayload = Omit<CheckpointFactBody, 'commandId'>

const booleanFactPayloadSchema = ScalarFactControllerRecordFactBody.omit({
  commandId: true,
})
const timeFactPayloadSchema = ScalarFactControllerRecordTimeBody.omit({
  commandId: true,
})
const ratingFactPayloadSchema = ScalarFactControllerRecordRatingBody.omit({
  commandId: true,
})
const checkpointFactPayloadSchema =
  ScalarFactControllerRecordCheckpointBody.omit({ commandId: true })

export function mapBooleanFact(
  values: BooleanFactFormValues,
  target: FactTarget,
): BooleanFactPayload {
  const form = booleanFactFormSchema.parse(values)
  return booleanFactPayloadSchema.parse({
    localDate: target.localDate,
    planGoalSnapshotId: target.planGoalSnapshotId,
    publicationId: target.publicationId,
    value: { kind: 'boolean', result: form.result },
  })
}

export function mapQuantityFact(
  values: QuantityFactFormValues,
  target: FactTarget,
  precision: number,
): QuantityFactPayload {
  const form = createQuantityFactFormSchema(precision).parse(values)
  return booleanFactPayloadSchema.parse({
    localDate: target.localDate,
    planGoalSnapshotId: target.planGoalSnapshotId,
    publicationId: target.publicationId,
    value: { kind: 'quantity', value: form.value },
  }) as QuantityFactPayload
}

export function mapTimeFact(
  values: ActualTimeFactFormValues,
  target: FactTarget,
): TimeFactPayload {
  const form = actualTimeFactFormSchema.parse(values)
  return timeFactPayloadSchema.parse({
    expectationDate: target.localDate,
    planGoalSnapshotId: target.planGoalSnapshotId,
    publicationId: target.publicationId,
    value: form.value,
  })
}

export function mapRatingFact(
  values: RatingFactFormValues,
  target: FactTarget,
  minimum: number,
  maximum: number,
): RatingFactPayload {
  const form = createRatingFactFormSchema(minimum, maximum).parse({
    value: String(values.value),
  })
  return ratingFactPayloadSchema.parse({
    expectationDate: target.localDate,
    planGoalSnapshotId: target.planGoalSnapshotId,
    publicationId: target.publicationId,
    value: form.value,
  })
}

export function mapCheckpointFact(
  checkpointId: string,
  values:
    BooleanFactFormValues | ActualTimeFactFormValues | RatingFactFormValues,
  target: FactTarget,
  kind: 'boolean' | 'actual_time' | 'rating',
  ratingRange?: Readonly<{ maximum: number; minimum: number }>,
): CheckpointFactPayload {
  const value =
    kind === 'boolean'
      ? { kind, result: booleanFactFormSchema.parse(values).result }
      : kind === 'actual_time'
        ? {
            kind,
            value: actualTimeFactFormSchema.parse(values).value,
          }
        : {
            kind,
            value: createRatingFactFormSchema(
              ratingRange?.minimum ?? Number.MIN_SAFE_INTEGER,
              ratingRange?.maximum ?? Number.MAX_SAFE_INTEGER,
            ).parse({
              value: String('value' in values ? values.value : ''),
            }).value,
          }

  return checkpointFactPayloadSchema.parse({
    checkpointId,
    expectationDate: target.localDate,
    planGoalSnapshotId: target.planGoalSnapshotId,
    publicationId: target.publicationId,
    value,
  })
}

export function finalizeBooleanFact(
  payload: BooleanFactPayload,
  commandId: string,
) {
  return ScalarFactControllerRecordFactBody.parse({ ...payload, commandId })
}

export function finalizeQuantityFact(
  payload: QuantityFactPayload,
  commandId: string,
) {
  return ScalarFactControllerRecordFactBody.parse({ ...payload, commandId })
}

export function finalizeTimeFact(payload: TimeFactPayload, commandId: string) {
  return ScalarFactControllerRecordTimeBody.parse({ ...payload, commandId })
}

export function finalizeRatingFact(
  payload: RatingFactPayload,
  commandId: string,
) {
  return ScalarFactControllerRecordRatingBody.parse({ ...payload, commandId })
}

export function finalizeCheckpointFact(
  payload: CheckpointFactPayload,
  commandId: string,
) {
  return ScalarFactControllerRecordCheckpointBody.parse({
    ...payload,
    commandId,
  })
}
