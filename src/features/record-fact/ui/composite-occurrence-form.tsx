import { useZodForm } from '@/shared/lib/form'
import {
  CompositeFactControllerRecordCompositeOccurrence422Response,
  compositeFactControllerRecordCompositeOccurrence,
} from '@/shared/api'
import { Button } from '@/shared/ui'

import {
  finalizeCompositeOccurrence,
  mapChecklistOccurrence,
  mapOrOccurrence,
} from '../model/composite-fact-mappers'
import { createOrVariantFactFormSchema } from '../model/composite-fact-schemas'
import { checklistItemFactFormSchema } from '../model/composite-fact-schemas'
import type { FactTarget } from '../model/record-fact-mappers'
import { useRecordFactIntent } from '../model/use-record-fact-intent'
import { useRecordFactIntentScope } from '../model/record-fact-intent-scope'
import {
  CompositeOccurrenceInput,
  type OccurrenceComponent,
} from './composite-occurrence-input'
import { RecordFactFormFeedback } from './record-fact-form-feedback'

export function CompositeOccurrenceForm({
  canMutate,
  component,
  isOnline,
  refetch,
  target,
}: Readonly<{
  canMutate: boolean
  component: OccurrenceComponent
  isOnline: boolean
  refetch: () => Promise<unknown>
  target: FactTarget
}>) {
  const schema =
    component.kind === 'or_variant'
      ? createOrVariantFactFormSchema(component.precision)
      : checklistItemFactFormSchema
  const form = useZodForm(schema, {
    defaultValues:
      component.kind === 'or_variant' ? { value: '' } : { state: 'done' },
  })
  const intent = useRecordFactIntent({
    finalizePayload: finalizeCompositeOccurrence,
    mapValues: (values: { state: 'done' | 'not_done' } | { value: string }) =>
      component.kind === 'or_variant'
        ? mapOrOccurrence(
            values as { value: string },
            target,
            component.variantId,
            component.precision,
          )
        : mapChecklistOccurrence(
            values as { state: 'done' | 'not_done' },
            target,
            component.itemId,
          ),
    refetch,
    send: (body) => compositeFactControllerRecordCompositeOccurrence(body),
  })
  useRecordFactIntentScope(intent.status, intent.abandon)
  const locked =
    intent.status === 'pending' ||
    intent.status === 'reconciling' ||
    intent.status === 'unknown' ||
    intent.isTerminal

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        void intent.submit(values, canMutate)
      })}
    >
      <CompositeOccurrenceInput
        component={component}
        canMutate={canMutate}
        form={form}
        locked={locked}
      />
      {canMutate && (
        <Button
          type="submit"
          size="sm"
          disabled={locked || !canMutate}
          isLoading={
            intent.status === 'pending' || intent.status === 'reconciling'
          }
          loadingLabel="Сохраняем"
        >
          Записать
        </Button>
      )}
      <RecordFactFormFeedback
        allowedPointers={[
          '/component',
          '/component/checklistItemId',
          '/component/kind',
          '/component/state',
          '/component/value',
          '/component/variantId',
          '/localDate',
          '/planGoalSnapshotId',
          '/publicationId',
        ]}
        error={intent.error}
        isOnline={isOnline}
        canMutate={canMutate}
        onAbandon={intent.abandon}
        onRetry={() => void intent.retry(canMutate)}
        problemSchema={
          CompositeFactControllerRecordCompositeOccurrence422Response
        }
        status={intent.status}
      />
    </form>
  )
}
