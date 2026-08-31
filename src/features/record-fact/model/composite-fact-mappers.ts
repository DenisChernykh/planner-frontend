import { z } from 'zod'

import {
  CompositeFactControllerRecordChecklistItemBody,
  CompositeFactControllerRecordCompositeOccurrenceBody,
  CompositeFactControllerRecordOrVariantBody,
  CompositeFactControllerRecordTextBody,
} from '@/shared/api'

import {
  checklistItemFactFormSchema,
  createOrVariantFactFormSchema,
  textFactFormSchema,
  type ChecklistItemFactFormValues,
  type OrVariantFactFormValues,
  type TextFactFormValues,
} from './composite-fact-schemas'
import type { FactTarget } from './record-fact-mappers'

type TextBody = z.infer<typeof CompositeFactControllerRecordTextBody>
type ChecklistItemBody = z.infer<
  typeof CompositeFactControllerRecordChecklistItemBody
>
type OrVariantBody = z.infer<typeof CompositeFactControllerRecordOrVariantBody>
type OccurrenceBody = z.infer<
  typeof CompositeFactControllerRecordCompositeOccurrenceBody
>

export type TextFactPayload = Omit<TextBody, 'commandId'>
export type ChecklistItemFactPayload = Omit<ChecklistItemBody, 'commandId'>
export type OrVariantFactPayload = Omit<OrVariantBody, 'commandId'>
export type CompositeOccurrencePayload = Omit<OccurrenceBody, 'commandId'>

const textPayloadSchema = CompositeFactControllerRecordTextBody.omit({
  commandId: true,
})
const checklistPayloadSchema =
  CompositeFactControllerRecordChecklistItemBody.omit({ commandId: true })
const orVariantPayloadSchema = CompositeFactControllerRecordOrVariantBody.omit({
  commandId: true,
})
const occurrencePayloadSchema =
  CompositeFactControllerRecordCompositeOccurrenceBody.omit({ commandId: true })

export function mapTextFact(
  values: TextFactFormValues,
  target: FactTarget,
  checkpointId: string | null,
): TextFactPayload {
  const form = textFactFormSchema.parse(values)
  return textPayloadSchema.parse({
    checkpointId,
    expectationDate: target.localDate,
    planGoalSnapshotId: target.planGoalSnapshotId,
    publicationId: target.publicationId,
    result: form.result,
    text: form.text,
  })
}

export function mapChecklistItemFact(
  values: ChecklistItemFactFormValues,
  target: FactTarget,
  checklistItemId: string,
  checkpointId: string | null,
): ChecklistItemFactPayload {
  const form = checklistItemFactFormSchema.parse(values)
  return checklistPayloadSchema.parse({
    checkpointId,
    checklistItemId,
    expectationDate: target.localDate,
    planGoalSnapshotId: target.planGoalSnapshotId,
    publicationId: target.publicationId,
    state: form.state,
  })
}

export function mapOrVariantFact(
  values: OrVariantFactFormValues,
  target: FactTarget,
  variantId: string,
  checkpointId: string | null,
  precision: number,
): OrVariantFactPayload {
  const form = createOrVariantFactFormSchema(precision).parse(values)
  return orVariantPayloadSchema.parse({
    checkpointId,
    expectationDate: target.localDate,
    planGoalSnapshotId: target.planGoalSnapshotId,
    publicationId: target.publicationId,
    value: form.value,
    variantId,
  })
}

export function mapChecklistOccurrence(
  values: ChecklistItemFactFormValues,
  target: FactTarget,
  checklistItemId: string,
): CompositeOccurrencePayload {
  const form = checklistItemFactFormSchema.parse(values)
  return occurrencePayloadSchema.parse({
    component: {
      checklistItemId,
      kind: 'checklist_item',
      state: form.state,
    },
    localDate: target.localDate,
    planGoalSnapshotId: target.planGoalSnapshotId,
    publicationId: target.publicationId,
  })
}

export function mapOrOccurrence(
  values: OrVariantFactFormValues,
  target: FactTarget,
  variantId: string,
  precision: number,
): CompositeOccurrencePayload {
  const form = createOrVariantFactFormSchema(precision).parse(values)
  return occurrencePayloadSchema.parse({
    component: {
      kind: 'or_variant',
      value: form.value,
      variantId,
    },
    localDate: target.localDate,
    planGoalSnapshotId: target.planGoalSnapshotId,
    publicationId: target.publicationId,
  })
}

export function finalizeTextFact(payload: TextFactPayload, commandId: string) {
  return CompositeFactControllerRecordTextBody.parse({ ...payload, commandId })
}

export function finalizeChecklistItemFact(
  payload: ChecklistItemFactPayload,
  commandId: string,
) {
  return CompositeFactControllerRecordChecklistItemBody.parse({
    ...payload,
    commandId,
  })
}

export function finalizeOrVariantFact(
  payload: OrVariantFactPayload,
  commandId: string,
) {
  return CompositeFactControllerRecordOrVariantBody.parse({
    ...payload,
    commandId,
  })
}

export function finalizeCompositeOccurrence(
  payload: CompositeOccurrencePayload,
  commandId: string,
) {
  return CompositeFactControllerRecordCompositeOccurrenceBody.parse({
    ...payload,
    commandId,
  })
}
