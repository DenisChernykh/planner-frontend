import { useZodForm } from '@/shared/lib/form'
import {
  CompositeFactControllerRecordOrVariant422Response,
  compositeFactControllerRecordOrVariant,
} from '@/shared/api'
import { Button, TextField } from '@/shared/ui'

import {
  finalizeOrVariantFact,
  mapOrVariantFact,
} from '../model/composite-fact-mappers'
import { createOrVariantFactFormSchema } from '../model/composite-fact-schemas'
import type { FactTarget } from '../model/record-fact-mappers'
import { useRecordFactIntent } from '../model/use-record-fact-intent'
import { useRecordFactIntentScope } from '../model/record-fact-intent-scope'
import { RecordFactFormFeedback } from './record-fact-form-feedback'

export function OrVariantFactForm({
  checkpointId = null,
  isOnline,
  label,
  precision,
  refetch,
  target,
  unit,
  variantId,
}: Readonly<{
  checkpointId?: string | null
  isOnline: boolean
  label: string
  precision: number
  refetch: () => Promise<unknown>
  target: FactTarget
  unit: string
  variantId: string
}>) {
  const schema = createOrVariantFactFormSchema(precision)
  const form = useZodForm(schema, { defaultValues: { value: '' } })
  const intent = useRecordFactIntent({
    finalizePayload: finalizeOrVariantFact,
    mapValues: (values: { value: string }) =>
      mapOrVariantFact(values, target, variantId, checkpointId, precision),
    refetch,
    send: (body) => compositeFactControllerRecordOrVariant(body),
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
        void intent.submit(values, isOnline)
      })}
    >
      <TextField
        className="min-w-28 flex-1"
        label={`${label} (${unit})`}
        inputMode="decimal"
        disabled={locked || !isOnline}
        error={form.formState.errors.value?.message}
        {...form.register('value')}
      />
      {isOnline && (
        <Button
          type="submit"
          size="sm"
          disabled={locked || !isOnline}
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
          '/checkpointId',
          '/expectationDate',
          '/planGoalSnapshotId',
          '/publicationId',
          '/value',
          '/variantId',
        ]}
        error={intent.error}
        isOnline={isOnline}
        onAbandon={intent.abandon}
        onRetry={() => void intent.retry(isOnline)}
        problemSchema={CompositeFactControllerRecordOrVariant422Response}
        status={intent.status}
      />
    </form>
  )
}
